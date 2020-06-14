const path = require("path");
const os = require("os");
const { ipcRenderer } = require("electron");
const { dialog } = require("electron").remote;

const form = document.getElementById("image-form");
const slider = document.getElementById("slider");
const img = document.getElementById("img");
const outputBtn = document.getElementById("output-btn");
const outputPath = document.getElementById("output-path");

outputPath.innerText = path.join(os.homedir(), "imageshrink");

const options = {
  defaultPath: path.join(os.homedir(), "imageshrink"),
  properties: ['openDirectory']
};

//Choosing output path
let savePath
outputBtn.addEventListener("click", () => {
  savePath = dialog.showOpenDialogSync(null, options);
  outputPath.innerText = savePath
});

//On submit
form.addEventListener("submit", (e) => {
  e.preventDefault(); //we dont want thee default to happen = send it to a file

  const imgPath = img.files[0].path;
  const quality = slider.value;

  ipcRenderer.send("image:minimize", {
    imgPath,
    quality,
    savePath,
  });
});

//On Done
ipcRenderer.on("image:done", () => {
  M.toast({
    html: `Image resized to: ${slider.value}% quality`,
  });
});
