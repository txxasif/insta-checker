# Instagram Checker

Bulk-check Instagram usernames in real time — see if accounts are active, deactivated, or non-existent.

🔗 **[github.com/txxasif/insta-checker](https://github.com/txxasif/insta-checker)**

---

## Setup

1. [Download the ZIP](https://github.com/txxasif/insta-checker/archive/refs/heads/main.zip) and extract it
2. Right-click **`setup.ps1`** → **Run with PowerShell**
3. Open your browser and go to **http://localhost:3000**

> If Windows blocks the script, open PowerShell as Administrator and run:
> `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

The app will start automatically every time Windows boots.

---

## Commands

| Task | Command |
|---|---|
| Check status | `pm2 status` |
| Restart | `pm2 restart instagram-checker` |
| Stop | `pm2 stop instagram-checker` |
| Start | `pm2 start instagram-checker` |
| Logs | `pm2 logs instagram-checker` |

---

## Uninstall

```powershell
pm2 stop instagram-checker
pm2 delete instagram-checker
pm2 save --force
pm2 unstartup
npm uninstall -g pm2
```

Then delete the project folder and uninstall Node.js from **Settings → Apps**.
