/* Ownership proofs are machine-verification artifacts, not editorial routes.
 * An exact, single root artifact is exempted from content-page inventory only;
 * it MUST still be shipped byte-for-byte to Bertina public_html.
 */
import fs from 'node:fs';
import path from 'node:path';

export const YANDEX_OWNERSHIP_FILE='yandex_24a6d171a0af5df0.html';
export const YANDEX_OWNERSHIP_HTML=`<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    </head>
    <body>Verification: 24a6d171a0af5df0</body>
</html>
`;

export function isOwnershipVerificationArtifact(relativePath){
  return typeof relativePath==='string' &&
    relativePath.replaceAll('\\','/')===YANDEX_OWNERSHIP_FILE;
}

export function verifyOwnershipArtifact(root){
  const source=path.join(root,YANDEX_OWNERSHIP_FILE);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile()||
     fs.readFileSync(source,'utf8')!==YANDEX_OWNERSHIP_HTML){
    throw Error('Yandex ownership artifact missing, changed or misplaced: '+source);
  }
  return source;
}
