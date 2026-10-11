# Academic editorial media — controlled upload

This folder exists solely to receive the owner-approved image package.

Upload the original file `academic_articles_10_original_webp_20261011.zip` here through GitHub → Add file → Upload files, on branch `migration/bertina-linux6`. Do not unzip it or put assets directly in the public website.

GitHub Actions workflow `Install 10 Academic Editorial Images` verifies the package, updates the 10 article featured images and news cards, registers the files, tests SEO and mobile layouts, removes the temporary zip from the working branch and starts Bertina deployment. On failure it will not deploy. It never touches passwords, transactions, authentication or other site services.

Do not rename the zip. Its expected manifest contains exactly 10 WebP images, each 1672×941 pixels.
