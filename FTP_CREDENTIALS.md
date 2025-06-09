# FTP Credentials for www.pyebwa.com

## Updated Credentials (as of June 2, 2025)

- **Host**: 145.223.107.9
- **Port**: 21
- **Username**: u316621955.pyebwa.com
- **Password**: Y5eTq?Pn|YFo&Jk#
- **Directory**: /domains/pyebwa.com/public_html/

## Files to Upload

The following files need to be uploaded to www.pyebwa.com to fix the authentication flow:

1. `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/index.html`
   - Contains autocomplete attributes for form fields
   
2. `/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com/js/app.js`
   - Contains the correct redirect URL to rasin.pyebwa.com/app/

## FTP Commands

```bash
# Using curl
cd /home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa.com
curl -T index.html ftp://u316621955.pyebwa.com:Y5eTq%3FPn%7CYFo%26Jk%23@145.223.107.9/domains/pyebwa.com/public_html/
curl -T js/app.js ftp://u316621955.pyebwa.com:Y5eTq%3FPn%7CYFo%26Jk%23@145.223.107.9/domains/pyebwa.com/public_html/js/

# Using Python
python3 -c "
import ftplib
ftp = ftplib.FTP('145.223.107.9')
ftp.login('u316621955.pyebwa.com', 'Y5eTq?Pn|YFo&Jk#')
ftp.cwd('domains/pyebwa.com/public_html')
# Upload files here
"
```

Note: The password contains special characters that may need escaping in URLs.