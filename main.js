const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require("electron");
const windowStateKeeper = require("electron-window-state");
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');


//Set env
process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
const isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let mainWindowPos;
let aboutWindow;

function createMainWindow() {
  //load the previous state with fallbacks to defaults
  let mainWindowState = windowStateKeeper();

  mainWindow = new BrowserWindow({
    title: "ImageShrink",
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: isDev ? 800 : 400,
    height: 650,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    //we want it to be resizible only in dev
    resizable: isDev,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindowPos = mainWindow.getPosition();

  mainWindowState.manage(mainWindow);

  //loads page in mainWindow
  // mainWindow.loadURL(`file://${__dirname}/app/index.html`)

  //another way and with this we don't have to add CSP
  mainWindow.loadFile("./app/index.html");
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "About ImageShrink",
    x: mainWindowPos[0] + 15,
    y: mainWindowPos[1] + 10,
    width: 300,
    height: 300,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    backgroundColor: "white",
  });

  aboutWindow.loadFile("./app/about.html");
}

app.on("ready", () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(null);
  mainWindow.setMenu(mainMenu);

  // globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload())
  globalShortcut.register(isMac ? "Command+Alt+I" : "Ctrl+Shift+I", () =>
    aboutWindow.toggleDevTools()
  );

  //Garbage Collection
  mainWindow.on("closed", () => (mainWindow = null));
});

const menu = [
  //@@@@not sure how it works@@@@
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),

  /* Manual way of writing menu 
    {
    label: "File",
    submenu: [
      {
        label: "Quit",
        //accelerator: isMac ? 'Command+W' : 'Ctrl+W', //adds shortcuts
        accelerator: 'CmdOrCtrl+W',  //shorter version
        click: () => app.quit(),
      },
    ],
  }   
    */
  {
    role: "fileMenu",
  },
  {
    label: "Help",
    submenu: [
      {
        label: "About",
        click: createAboutWindow,
      },
    ],
  },
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggleDevTools" },
          ],
        },
      ]
    : []),
];

ipcMain.on('image:minimize', (e, options) => {
  shrinkImage(options)
})

async function shrinkImage({ imgPath, quality, savePath }) {
  try {
    const dest = savePath[0]
    const pngQuality = quality / 100  //for imageminPngquant cuz it accepts quality as a decimal
    //wrapped in slash() for Windows
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality]
        })
      ]
    })  
    
    log.info(files)
    shell.openPath(dest)

    mainWindow.webContents.send('image:done')

  } catch (err) {
    log.error(err)
  }
}

//one way to show menu on Mac
/* if (isMac) {
  menu.unshift({ role: "appMenu" });
} */

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
