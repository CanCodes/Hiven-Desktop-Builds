const { ipcRenderer } = require("electron");
const localforage = require('localforage');
window["ipc"] = ipcRenderer;

const { desktopCapturer } = require('electron')
window.navigator.mediaDevices.getDisplayMedia = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const uiShitJson = JSON.parse(await localforage.getItem('persist:ui'))
      const actualUiShit = JSON.parse(uiShitJson.custom_theme);
      // We need this here
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

        </style>`
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })

      const selectionElem = document.createElement('div')
      selectionElem.classList = 'desktop-capturer-selection'
      selectionElem.innerHTML = `${style}
        <div class="desktop-capturer-selection__scroller">
          <div class="desktop-capturer-selection__container">
          <ul class="desktop-capturer-selection__list">
          <h1 class="desktop-capturer-selection__title">Screen share</h1>
              ${sources.map(({ id, name, thumbnail, display_id, appIcon }) => `
                <li class="desktop-capturer-selection__item">
                  <button class="desktop-capturer-selection__btn" data-id="${id}" title="${name}">
                    <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}" />
                    <span class="desktop-capturer-selection__name">${name}</span>
                  </button>
                </li>
              `).join('')}
              <button onclick="const selectionElem = document.querySelector('.desktop-capturer-selection'); selectionElem.classList.add('remove'); setTimeout(() => selectionElem.remove(), 140)" class="desktop-capturer-selection__close">Cancel</button>
            </ul>
          </div>
        </div>
      `
      document.body.appendChild(selectionElem)
      document.addEventListener('keydown', closeWindow);
      document.querySelectorAll('.desktop-capturer-selection__btn')
        .forEach(button => {
          button.addEventListener('click', async () => {
            try {
              const id = button.getAttribute('data-id')
              const source = sources.find(source => source.id === id)
              if (!source) {
                throw new Error(`Source with id ${id} does not exist`)
              }

              const stream = await window.navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: source.id
                  }
                }
              })
              resolve(stream)

              closeWindow();
            } catch (err) {
              console.error('Error selecting desktop capture source:', err)
              reject(err)
            }
          })
        })
      function closeWindow(e) {
        this.removeEventListener('keydown', closeWindow); // Remove event listener 
        selectionElem.classList.add('remove');
        setTimeout(() => selectionElem.remove(), 140) // Wait to get rid of the element before the animation stops!
      }
    } catch (err) {
      console.error('Error displaying desktop capture sources:', err)
      reject(err)
    }
  })
}