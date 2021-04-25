const { ipcRenderer } = require("electron");
const localforage = require('localforage');

window["ipc"] = ipcRenderer;

const { desktopCapturer } = require("electron");
window.navigator.mediaDevices.getDisplayMedia = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const uiShitJson = JSON.parse(await localforage.getItem("persist:ui"));
      const actualUiShit = JSON.parse(uiShitJson.custom_theme);

      // We need this here so it doesn't say permission denied
      const style = `<style>
        .remove { animation: fadeOut 150ms }
        .desktop-capturer-selection {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          color: white;
          z-index: 10000000;
          opacity: 1;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .desktop-capturer-selection__scroller {
          width: 100%;
          max-height: 100vh;
          overflow-y: auto;
          -webkit-animation: bkWPfY .2s;
          animation: bkWPfY .2s;
        }
        .desktop-capturer-selection__list {
          position: relative;
          max-width: calc(100% - 287px);
          margin: 0 auto;
          padding: 65px 37px;
          display: flex;
          flex-wrap: wrap;
          list-style: none;
          overflow: hidden;
          align-self: center;
          justify-content: center;
          background: ${actualUiShit.layoutDarker};
          border-radius: 9px;
        }
        .desktop-capturer-selection__title {
          position: absolute;
          margin-top: -45px;
          font-size: 16pt;
          z-index: 1;
          color: ${actualUiShit.textLighter};
        }
        .desktop-capturer-selection__close {
          cursor: pointer;
          position: absolute;
          border-radius: 5px;
          padding: 7px 15px;
          background: transparent;
          border: none;
          bottom: 23px;
          font-size: 17px;
          color: rgb(255, 79, 79);
          background: transparent;
          transition: background-color .25s, color .25s;
        }
        .desktop-capturer-selection__close:hover {
          background-color: #802828;
          color: rgb(255, 255, 255);
        }
        .desktop-capturer-selection__item {
          display: flex;
          margin: 4px;
        }
        .desktop-capturer-selection__appIcon {
          width: 25px;
          height: 25px;
          background: ${actualUiShit.layoutLighter};
          padding: 3px;
          border-radius: 50%;
          margin-top: -10px;
          margin-right: -21px;
          z-index: 1;
        }
        .desktop-capturer-selection__btn {
          display: flex;
          cursor: pointer;
          flex-direction: column;
          align-items: stretch;
          width: 155px;
          margin: 0;
          border: 0;
          border-radius: 4px;
          padding: 4px;
          background: transparent;
          text-align: left;
          transition: background-color .15s, box-shadow .15s;
        }
        .desktop-capturer-selection__btn:hover,
        .desktop-capturer-selection__btn:focus {
          background: ${actualUiShit.layoutLighter};
        }
        .desktop-capturer-selection__thumbnail {
          width: 100%;
          height: 81px;
          object-fit: cover;
          border-radius: 5px;
        }
        .desktop-capturer-selection__name {
          margin: 6px 0;
          white-space: nowrap;
          text-overflow: ellipsis;
          color: white;
          overflow: hidden;
          text-align: center;
        }

        @-webkit-keyframes fadeOut {
          from {
            opacity: 1;
          } to {
            opacity: 0;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          } to {
            opacity: 0;
          }
        }

        </style>`;

      // Get the windows/screens
      const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        fetchWindowIcons: true,
      });
      console.log(sources);
      console.log(sources[0].appIcon);
      // Create element
      const selectionElem = document.createElement("div");

      // Add class name to it
      selectionElem.classList = "desktop-capturer-selection";

      // Add style sheet and html skeleton
      selectionElem.innerHTML = `${style}
        <div class="desktop-capturer-selection__scroller">
          <div class="desktop-capturer-selection__container">
          <ul class="desktop-capturer-selection__list">
          <h1 class="desktop-capturer-selection__title">Screen share</h1>
              ${sources
                .map(
                  ({ id, name, thumbnail, display_id, appIcon }) => `
                <li class="desktop-capturer-selection__item">
                  <img class="desktop-capturer-selection__appIcon" src="${
                    // This ternary expression is realllyyy ugly, but it basically says, if its a screen, put a screen svg, if app doesnt have an icon, put a screen svg as the icon, if everything else passes, put the apps icon as the icon
                    typeof appIcon != "undefined" && appIcon
                      ? appIcon.toDataURL() !== "data:image/png;base64,"
                        ? appIcon.toDataURL()
                        : `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-monitor'><rect x='2' y='3' width='20' height='14' rx='2' ry='2'></rect><line x1='8' y1='21' x2='16' y2='21'></line><line x1='12' y1='17' x2='12' y2='21'></line></svg>`
                      : `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-monitor'><rect x='2' y='3' width='20' height='14' rx='2' ry='2'></rect><line x1='8' y1='21' x2='16' y2='21'></line><line x1='12' y1='17' x2='12' y2='21'></line></svg>`
                  }" />
                  <button class="desktop-capturer-selection__btn" data-id="${id}" title="${name}">
                    <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}" />
                    <span class="desktop-capturer-selection__name">${name}</span>
                  </button>
                </li>
              `
                )
                .join("")}
              <button onclick="const selectionElem = document.querySelector('.desktop-capturer-selection'); selectionElem.classList.add('remove'); setTimeout(() => selectionElem.remove(), 140)" class="desktop-capturer-selection__close">Cancel</button>
            </ul>
          </div>
        </div>
      `;
      document.body.appendChild(selectionElem);
      document.addEventListener("keydown", closeWindow, { once: true });
      document
        .querySelectorAll(".desktop-capturer-selection__btn")
        .forEach((button) => {
          button.addEventListener("click", async () => {
            try {
              const id = button.getAttribute("data-id");
              const source = sources.find((source) => source.id === id);
              if (!source) {
                throw new Error(`Source with id ${id} does not exist`);
              }

              const stream = await window.navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: source.id,
                  },
                },
              });
              resolve(stream);

              closeWindow();
            } catch (err) {
              console.error("Error selecting desktop capture source:", err);
              reject(err);
            }
          });
        });
      function closeWindow(_e) {
        selectionElem.classList.add("remove");
        setTimeout(() => selectionElem.remove(), 140); // Wait to get rid of the element before the animation stops!
      }
    } catch (err) {
      console.error("Error displaying desktop capture sources:", err);
      reject(err);
    }
  });
};
