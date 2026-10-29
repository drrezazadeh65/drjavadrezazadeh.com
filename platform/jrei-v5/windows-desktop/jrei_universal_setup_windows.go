//go:build windows

// JREI one-file Windows offline installer, using only the Go standard library.
//
// Unlike Inno Setup's loader, this bootstrap never creates or executes
// is-*.tmp files beneath Windows TEMP. It extracts the embedded vetted payload
// DIRECTLY to an immutable version folder under the owner's LocalAppData.
// No remote downloads, admin rights, self-elevation, registry security changes,
// Python installation, force-kill, service duplication or private key cloning.
package main

import (
 "archive/zip"
 "bytes"
 _ "embed"
 "crypto/sha256"
 "errors"
 "fmt"
 "io"
 "os"
 "os/exec"
 "path/filepath"
 "runtime"
 "strings"
 "syscall"
 "unsafe"
)

const version = "0.1.9"
const maxEntries = 24000
const maxSingleFile = int64(450 << 20)
const maxTotalBytes = int64(1200 << 20)

// payload.zip is assembled by the established manually-dispatched GitHub
// workflow from the exact canonical source checkout and Windows runner builds.
//go:embed payload.zip
var payload []byte

var user32 = syscall.NewLazyDLL("user32.dll")
var messageBoxW = user32.NewProc("MessageBoxW")

func dialog(title, message string, failure bool) {
 flags := uintptr(0x00000040) // MB_ICONINFORMATION
 if failure { flags = 0x00000010 } // MB_ICONERROR
 t, _ := syscall.UTF16PtrFromString(title)
 m, _ := syscall.UTF16PtrFromString(message)
 messageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), flags)
}

func fatal(err error) {
 // Explicitly omit raw OS paths and error strings from the popup:
 // private profile locations and identities are not shared with others.
 msg := "JREI نصب کامل نشد.\n\n"+err.Error()+
        "\n\nفایل‌های شخصی و شناسهٔ گره تغییر داده نشده‌اند."
 dialog("JREI | Installation blocked", msg, true)
 os.Exit(1)
}

// Installer candidate roots are per-user and no-elevation. Never modify
// security descriptors, disable Windows protection, or reuse another
// account's node token/DB. The alternative roots allow environments where
// the normal AppData\Local\Programs tree is denied by local policy.
type installCandidate struct {
 root string
 relative string
}

func candidates() ([]installCandidate,error) {
 if runtime.GOOS != "windows" || runtime.GOARCH != "amd64" {
  return nil,errors.New("JREI_WINDOWS_X64_REQUIRED")
 }
 local:=os.Getenv("LOCALAPPDATA")
 profile:=os.Getenv("USERPROFILE")
 if local=="" || !filepath.IsAbs(local) {
  return nil,errors.New("JREI_LOCAL_PROFILE_NOT_AVAILABLE")
 }
 if profile=="" || !filepath.IsAbs(profile) {
  return nil,errors.New("JREI_USER_PROFILE_NOT_AVAILABLE")
 }
 return []installCandidate{
  {local,filepath.Join("Programs","JREI","releases","v"+version)},
  {local,filepath.Join("JREI-Applications","releases","v"+version)},
  {profile,filepath.Join("JREI-Applications","releases","v"+version)},
 },nil
}

// Writable-path discovery has TWO different failure modes: Windows denied
// creating the directory, or Windows accepted the directory but denied a file
// write from THIS installer executable. Distinguish these from invalid paths,
// and preserve the failure categories without disclosing the user's path.
func writableInstallLocation() (string,error) {
 options,err:=candidates()
 if err!=nil {return "",err}
 var rejected []string
 for index,option:=range options {
  target:=filepath.Join(option.root,option.relative)
  if err=checkDirectoryChain(target);err!=nil {
   rejected=append(rejected,fmt.Sprintf("R%d_UNSAFE_ROOT",index+1))
   continue
  }
  if err=safeDirectory(option.root,option.relative);err!=nil {
   switch err.Error() {
   case "JREI_PROGRAM_DIRECTORY_NOT_WRITABLE":
    rejected=append(rejected,fmt.Sprintf("R%d_CREATE_DENIED",index+1))
    continue
   default:
    rejected=append(rejected,fmt.Sprintf("R%d_PATH_REJECTED",index+1))
    continue
   }
  }
  // A CreateTemp probe and a close/remove probe are necessary because
  // a created directory is not sufficient evidence the same EXE can write.
  probe,e:=os.CreateTemp(target,".jrei-install-probe-*")
  if e!=nil {
   rejected=append(rejected,fmt.Sprintf("R%d_WRITE_DENIED",index+1))
   continue
  }
  name:=probe.Name()
  closeErr:=probe.Close()
  removeErr:=os.Remove(name)
  if closeErr!=nil||removeErr!=nil {
   rejected=append(rejected,fmt.Sprintf("R%d_CLEANUP_DENIED",index+1))
   continue
  }
  return target,nil
 }
 // The owner launches the setup from an extracted folder in Downloads.
 // Where a managed Windows profile blocks standard AppData locations,
 // a portable fallback beside the downloaded installer can be used, but
 // ONLY if the installer is under this user's own profile and the
 // destination is not a symlink/junction. No system or shared paths.
 executable,exeErr:=os.Executable()
 profile:=os.Getenv("USERPROFILE")
 if exeErr==nil && profile!="" {
  exeDir:=filepath.Dir(executable)
  p:=filepath.Clean(profile)+string(filepath.Separator)
  if strings.HasPrefix(strings.ToLower(exeDir+string(filepath.Separator)),strings.ToLower(p)) &&
     !strings.Contains(strings.ToLower(exeDir),"\\windowsapps\\") {
   relative:=filepath.Join("JREI-Installed","releases","v"+version)
   fallback:=filepath.Join(exeDir,relative)
   if st,statErr:=os.Lstat(exeDir);statErr==nil && st.IsDir() && st.Mode()&os.ModeSymlink==0 {
    if e:=checkDirectoryChain(fallback);e==nil {
     if e=safeDirectory(exeDir,relative);e==nil {
      probe,writeErr:=os.CreateTemp(fallback,".jrei-install-probe-*")
      if writeErr==nil {
       name:=probe.Name()
       closeErr:=probe.Close()
       removeErr:=os.Remove(name)
       if closeErr==nil && removeErr==nil {return fallback,nil}
      }
     }
    }
   }
  }
 }
 // Short, machine-safe per-root codes; no raw username, home path or ACLs
 // in any displayed error. The same code identifies the actual failed stage.
 return "",errors.New("JREI_INSTALL_NO_WRITABLE_ROOT_"+strings.Join(rejected,"_"))
}

func safeDirectory(root, part string) error {
 if part == "." || part == "" { return nil }
 // Every existing intermediate component must be a real directory, not a
 // Windows junction, symlink or user-replaced reparse point.
 path := root
 for _, seg := range strings.Split(filepath.Clean(part), string(filepath.Separator)) {
  if seg == "." || seg == "" { continue }
  if seg == ".." || strings.ContainsAny(seg, ":\\") {
   return errors.New("JREI_PAYLOAD_DIRECTORY_REJECTED")
  }
  path = filepath.Join(path, seg)
  st, err := os.Lstat(path)
  if errors.Is(err, os.ErrNotExist) {
   if err = os.Mkdir(path, 0700); err != nil {
    return errors.New("JREI_PROGRAM_DIRECTORY_NOT_WRITABLE")
   }
   continue
  }
  if err != nil || !st.IsDir() || st.Mode()&os.ModeSymlink != 0 ||
     st.Mode()&os.ModeIrregular != 0 {
   return errors.New("JREI_PROGRAM_DIRECTORY_UNSAFE")
  }
 }
 return nil
}

func checkDirectoryChain(path string) error {
 // Walk from the volume root. Existing junction/reparse points within
 // LocalAppData's normal ancestry may include Windows-managed profile links;
 // do not follow reparse points INSIDE JREI's release folder.
 st, err := os.Lstat(path)
 if err == nil && (!st.IsDir() || st.Mode()&os.ModeSymlink != 0) {
  return errors.New("JREI_RELEASE_ROOT_NOT_A_DIRECTORY")
 }
 if err != nil && !errors.Is(err, os.ErrNotExist) {
  return errors.New("JREI_RELEASE_ROOT_UNAVAILABLE")
 }
 return nil
}

func cleanName(name string) (string, error) {
 if name == "" || strings.Contains(name, "\\") || strings.HasPrefix(name, "/") ||
    strings.ContainsRune(name, ':') || strings.ContainsRune(name, 0) {
  return "", errors.New("JREI_PAYLOAD_NAME_UNSAFE")
 }
 clean := filepath.Clean(filepath.FromSlash(name))
 if clean == "." || clean == ".." || filepath.IsAbs(clean) ||
   strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
  return "", errors.New("JREI_PAYLOAD_ESCAPE_REJECTED")
 }
 // Windows reserved device names are not acceptable in package entries.
 for _, seg := range strings.Split(clean, string(filepath.Separator)) {
  key := strings.ToUpper(strings.SplitN(seg, ".", 2)[0])
  if seg == "" || seg == ".." || strings.HasSuffix(seg, " ") ||
    strings.HasSuffix(seg, ".") || key == "CON" || key == "PRN" ||
    key == "AUX" || key == "NUL" || key == "COM1" || key == "LPT1" {
    return "", errors.New("JREI_PAYLOAD_WINDOWS_PATH_REJECTED")
  }
 }
 return clean, nil
}

func existingDigest(file string, expected [32]byte) (bool, error) {
 st, err := os.Lstat(file)
 if errors.Is(err, os.ErrNotExist) { return false, nil }
 if err != nil || !st.Mode().IsRegular() || st.Mode()&os.ModeSymlink != 0 {
  return false, errors.New("JREI_EXISTING_PROGRAM_FILE_UNSAFE")
 }
 f, err := os.Open(file)
 if err != nil { return false, errors.New("JREI_EXISTING_PROGRAM_FILE_UNREADABLE") }
 defer f.Close()
 h := sha256.New()
 if _, err := io.Copy(h, f); err != nil {
  return false, errors.New("JREI_EXISTING_PROGRAM_HASH_FAILED")
 }
 return bytes.Equal(h.Sum(nil), expected[:]), nil
}

func extractPayload(target string) error {
 if len(payload) < 100 || len(payload) > (600<<20) {
  return errors.New("JREI_EMBEDDED_PAYLOAD_SIZE_INVALID")
 }
 archive, err := zip.NewReader(bytes.NewReader(payload), int64(len(payload)))
 if err != nil || len(archive.File) == 0 || len(archive.File) > maxEntries {
  return errors.New("JREI_EMBEDDED_PAYLOAD_INVALID")
 }
 seen := make(map[string]bool)
 var size int64
 for _, entry := range archive.File {
  relative, err := cleanName(strings.TrimSuffix(entry.Name, "/"))
  if err != nil { return err }
  key := strings.ToLower(relative)
  if seen[key] { return errors.New("JREI_DUPLICATE_PAYLOAD_FILE") }
  seen[key] = true
  mode := entry.Mode()
  if mode&os.ModeSymlink != 0 || mode&os.ModeIrregular != 0 {
   return errors.New("JREI_PAYLOAD_LINK_REJECTED")
  }
  if entry.FileInfo().IsDir() { continue }
  if !mode.IsRegular() || entry.UncompressedSize64 > uint64(maxSingleFile) ||
     int64(entry.UncompressedSize64) > maxTotalBytes-size {
   return errors.New("JREI_PAYLOAD_FILE_SIZE_REJECTED")
  }
  size += int64(entry.UncompressedSize64)
 }
 expectedFiles := []string{
  "JREI.exe",
  "jrei-engine-setup.ps1",
  "jrei-device-inventory.ps1",
  "jrei-shortcuts.ps1",
  "jrei-engine-manifest.json",
  "engine-v"+version+"/JREI-Engine.exe",
  "source-v"+version+"/platform/jrei-python/jrei_service/windows_command_center.py",
 }
 for _, required := range expectedFiles {
  if !seen[strings.ToLower(filepath.FromSlash(required))] {
   return errors.New("JREI_PAYLOAD_REQUIRED_PROGRAM_FILE_MISSING")
  }
 }
 for _, entry := range archive.File {
  relative, _ := cleanName(strings.TrimSuffix(entry.Name, "/"))
  path := filepath.Join(target, relative)
  if err := safeDirectory(target, filepath.Dir(relative)); err != nil { return err }
  if entry.FileInfo().IsDir() {
   if err := safeDirectory(target, relative); err != nil { return err }
   continue
  }
  // Stream every ZIP member to a fresh temporary *sibling in the release
  // folder*, not Windows Temp. Validate CRC via the zip reader and SHA256
  // before committing. Never overwrite an unexpected existing file.
  reader, err := entry.Open()
  if err != nil { return errors.New("JREI_PAYLOAD_READ_FAILED") }
  staging, err := os.CreateTemp(filepath.Dir(path), ".jrei-stage-*")
  if err != nil { reader.Close(); return errors.New("JREI_RELEASE_DIRECTORY_NOT_WRITABLE") }
  tmp := staging.Name()
  h := sha256.New()
  written, copyErr := io.Copy(io.MultiWriter(staging, h), io.LimitReader(reader, maxSingleFile+1))
  closeErr := reader.Close()
  writeErr := staging.Close()
  if copyErr != nil || closeErr != nil || writeErr != nil ||
     written != int64(entry.UncompressedSize64) || written > maxSingleFile {
   os.Remove(tmp)
   return errors.New("JREI_PAYLOAD_EXTRACTION_INTEGRITY_FAILURE")
  }
  var sum [32]byte
  copy(sum[:], h.Sum(nil))
  same, err := existingDigest(path, sum)
  if err != nil { os.Remove(tmp); return err }
  if same { os.Remove(tmp); continue }
  if _, err := os.Lstat(path); err == nil {
   os.Remove(tmp)
   return errors.New("JREI_RELEASE_VERSION_FILE_CHANGED_ABORTING")
  } else if !errors.Is(err, os.ErrNotExist) {
   os.Remove(tmp)
   return errors.New("JREI_RELEASE_FILE_NOT_ACCESSIBLE")
  }
  if err := os.Rename(tmp, path); err != nil {
   os.Remove(tmp)
   return errors.New("JREI_PROGRAM_FILE_COMMIT_FAILED")
  }
 }
 return nil
}

func powershellPath() (string, error) {
 system := os.Getenv("SystemRoot")
 if system == "" || !filepath.IsAbs(system) {
  return "", errors.New("JREI_WINDOWS_SYSTEM_PATH_UNAVAILABLE")
 }
 path := filepath.Join(system, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
 if stat, err := os.Stat(path); err != nil || !stat.Mode().IsRegular() {
  return "", errors.New("JREI_WINDOWS_POWERSHELL_NOT_FOUND")
 }
 return path, nil
}

func runScript(ps, script string, args ...string) error {
 argv := []string{"-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script}
 argv = append(argv, args...)
 command := exec.Command(ps, argv...)
 command.Dir = filepath.Dir(script)
 // Do not print secrets, scripts or source lines to user-facing logs.
 output, err := command.CombinedOutput()
 if err != nil {
  // Script emits deliberately bounded named JREI_ codes. Do not print raw
  // stderr because Windows error wrappers may include a private username.
  for _, row := range strings.Fields(string(output)) {
   row = strings.Trim(row, ".,:;\"'")
   if strings.HasPrefix(row, "JREI_") && len(row) <= 115 {
    return errors.New(row)
   }
  }
  return errors.New("JREI_ENGINE_INSTALL_OR_SHORTCUT_STEP_FAILED")
 }
 return nil
}

func main() {
 target, err := writableInstallLocation()
 if err != nil { fatal(err) }
 // Only a validated, writable, version-specific per-user program directory
 // is selected. Source and owner-private state remain separate.
 if err := extractPayload(target); err != nil { fatal(err) }
 ps, err := powershellPath()
 if err != nil { fatal(err) }
 engineResult := runScript(ps, filepath.Join(target, "jrei-engine-setup.ps1"),
    "-Mode", "Install", "-OwnerApproved")
 // Shortcut generation never gates engine activation; if the desktop is
 // redirected or blocked, the installed program can still be opened through
 // its fixed per-user release path.
 shortcutResult := runScript(ps, filepath.Join(target, "jrei-shortcuts.ps1"),
    "-AppExe", filepath.Join(target, "JREI.exe"))
 if engineResult != nil {
  note := ""
  if shortcutResult != nil { note = "\nساخت میان‌بر نیز با مشکل روبه‌رو شد." }
  dialog("JREI | Installation incomplete",
   "فایل‌های برنامه نصب شدند، اما موتور خصوصی هنوز تأیید نشده است.\n"+
   "کد خطا: "+engineResult.Error()+note+"\n"+
   "داده‌ها و سرویس‌های قبلی حفظ شده‌اند.", true)
  os.Exit(2)
 }
 if shortcutResult != nil {
  dialog("JREI | Shortcut not created",
   "فایل‌های برنامه و موتور خصوصی آماده شدند، اما میان‌بر دسکتاپ ساخته نشد.\n"+
   "کد خطا: "+shortcutResult.Error()+"\n"+
   "هیچ اطلاعات خصوصی حذف نشده است.", true)
  os.Exit(3)
 }
 dialog("JREI | Installation completed",
  "فایل‌های برنامه نصب و میان‌بر ساخته شد.\n"+
  "اسکریپت راه‌اندازی موتور خصوصی بدون خطا پایان یافت.\n"+
  "کارکرد مدل و اتصال دو گره هنوز نیازمند پذیرش واقعی است.", false)
}
