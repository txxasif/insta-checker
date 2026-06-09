# Instagram Checker

Bulk-check Instagram usernames in real time — see if accounts are active, deactivated, or non-existent.

🔗 **[github.com/txxasif/insta-checker](https://github.com/txxasif/insta-checker)**

---

## Setup

1. [Download the ZIP](https://github.com/txxasif/insta-checker/archive/refs/heads/main.zip) and extract it on your computer.
2. Double-click the file named **`setup.bat`**.
3. A window will open asking for Administrator permissions. Click **Yes**.
4. Wait for the installation to finish, then press **Enter** to close the window.
5. Open your browser and go to: **[http://localhost:3000](http://localhost:3000)**

The app will now start automatically every time your computer turns on.

---

## Managing the App

If you ever need to manually control the application, open PowerShell and use:

| Task | Command |
|---|---|
| Check status | `pm2 status` |
| Restart | `pm2 restart instagram-checker` |
| Stop | `pm2 stop instagram-checker` |
| Start | `pm2 start instagram-checker` |
| Logs | `pm2 logs instagram-checker` |

---

## Uninstall

1. Double-click the file named **`uninstall.bat`**.
2. Click **Yes** when it asks for Administrator permissions.
3. Wait for it to finish, then press **Enter** to close.
4. Delete the project folder from your computer.
5. (Optional) Uninstall Node.js from Windows Settings → Apps.
