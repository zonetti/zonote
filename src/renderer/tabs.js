const hotkeys = require('hotkeys-js')

const tabsElm = document.getElementById('tabs')
const tabScrollLeftElm = document.getElementById('tab-scroll-left')
const tabScrollRightElm = document.getElementById('tab-scroll-right')
const removeNoteElm = document.getElementById('remove-note')

EVENTS.on('toggle tabs', () => {
  EVENTS.emit('hide menu')

  if (STATE.tabs.length > 0) {
    const tabsWithNotes = STATE.notes
      .map(note => note.t)
      .filter((value, index, self) => self.indexOf(value) === index)

    if (tabsWithNotes.length === 1) {
      STATE.notes = STATE.notes.map(note => ({ ...note, t: 0 }))
    } else if (tabsWithNotes.length > 1) {
      const chosenAction = DIALOG.showMessageBoxSync({
        message: 'All your existing notes will be merged into one canvas.\nAre you sure you want to proceed?',
        buttons: ['Yes', 'No']
      })
      if (chosenAction === 1) return
      STATE.notes = STATE.notes.map(note => ({ ...note, t: 0 }))
    }
    STATE.tabs = []
  } else {
    STATE.tabs = ['new tab']
    EVENTS.emit('touch state')
  }

  STATE.activeTab = 0
  EVENTS.emit('touch state')
  EVENTS.emit('render')
})

EVENTS.on('render tab scroll', () => {
  const newTabButtonElm = document.getElementById('new-tab-button')
  const showLeft = tabsElm.scrollLeft > 0
  const scrollRight = tabsElm.scrollWidth - tabsElm.scrollLeft - window.innerWidth > 0
  tabScrollLeftElm.style.display = showLeft ? 'block' : 'none'
  tabScrollRightElm.style.display = scrollRight ? 'block' : 'none'
})

EVENTS.on('render', () => {
  tabsElm.innerHTML = ''
  tabsElm.style.display = STATE.tabs.length > 0 ? 'inline-flex' : 'none'
  tabScrollLeftElm.style.display = 'none'
  tabScrollRightElm.style.display = 'none'

  if (!STATE.tabs.length) return

  let tabBeingDragged = null

  STATE.tabs.forEach((tabText, tabIndex) => {
    const isActiveTab = STATE.activeTab === tabIndex

    const tabElm = document.createElement('li')
    tabElm.dataset.index = '' + tabIndex
    tabElm.draggable = 'true'

    tabElm.ondrag = function (event) {
      tabBeingDragged = this
    }

    tabElm.ondragover = event => event.preventDefault()

    tabElm.ondragenter = function (event) {
      if (this.isSameNode(tabBeingDragged)) return
      this.style.backgroundColor = '#4ECDC4'
      this.style.color = '#FFF'
    }

    tabElm.ondragleave = function (event) {
      if (this.isSameNode(tabBeingDragged)) return
      if (this.contains(document.elementFromPoint(event.pageX, event.pageY))) return
      this.style.backgroundColor = ''
      this.style.color = ''
    }

    tabElm.ondrop = function (event) {
      event.preventDefault()

      this.style.backgroundColor = ''
      const fromIndex = parseInt(tabBeingDragged.dataset.index, 10)
      const toIndex = parseInt(this.dataset.index, 10)

      STATE.notes = STATE.notes.map(note => {
        if (![fromIndex, toIndex].includes(note.t)) return note
        note.t = note.t === fromIndex ? toIndex : fromIndex
        return note
      })

      const tempTab = STATE.tabs[fromIndex]
      STATE.tabs[fromIndex] = STATE.tabs[toIndex]
      STATE.tabs[toIndex] = tempTab
      tabBeingDragged = null

      if (STATE.activeTab === fromIndex) {
        STATE.activeTab = toIndex
      }

      EVENTS.emit('render')
    }

    const spanElm = document.createElement('span')
    spanElm.ondragover = event => event.preventDefault()
    spanElm.innerHTML = tabText

    if (isActiveTab) {
      spanElm.contentEditable = 'true'
      spanElm.spellcheck = false
    }

    const removeButtonElm = document.createElement('button')
    removeButtonElm.ondragover = event => event.preventDefault()
    removeButtonElm.type = 'button'
    removeButtonElm.style.opacity = isActiveTab ? 1 : 0
    removeButtonElm.innerHTML = '𝗑'
    removeButtonElm.onclick = event => {
      event.stopPropagation()
      EVENTS.emit('remove tab', tabIndex)
    }

    tabElm.append(spanElm)
    tabElm.append(removeButtonElm)

    if (isActiveTab) {
      tabElm.className = 'active'
      tabElm.onclick = event => event.stopPropagation()
      spanElm.oninput = function () {
        EVENTS.emit('touch state')
        if (this.innerHTML.length <= 100) return
        this.innerHTML = this.innerHTML.substring(0, 100)
      }
      spanElm.onblur = function () {
        const value = this.innerHTML
          .replace(/&nbsp;/g, ' ')
          .replace(/[,|]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        this.innerHTML = value || 'new tab'
        STATE.tabs[tabIndex] = this.innerHTML
      }
    } else {
      tabElm.style.userSelect = 'none'
      tabElm.onclick = () => {
        STATE.activeTab = tabIndex
        EVENTS.emit('render')
      }
      tabElm.onmouseenter = () => {
        removeButtonElm.style.opacity = 1
        if (GUI_STATE.isDragging) {
          STATE.activeTab = tabIndex
          GET_NOTE_BY_ID(GUI_STATE.elementBeingDraggedElm.dataset.id).t = tabIndex
          EVENTS.emit('render')
          GUI_STATE.elementBeingDraggedElm.style.zIndex = NEXT_ZINDEX()
          removeNoteElm.style.zIndex = NEXT_ZINDEX()
        }
      }
      tabElm.onmouseleave = () => {
        removeButtonElm.style.opacity = 0
      }
    }
    tabsElm.append(tabElm)
  })

  const newTabButtonElm = document.createElement('li')
  newTabButtonElm.id = 'new-tab-button'
  newTabButtonElm.innerHTML = '+'
  newTabButtonElm.onmouseenter = function () { this.innerHTML = '+ new tab' }
  newTabButtonElm.onmouseleave = function () { this.innerHTML = '+' }
  newTabButtonElm.onclick = () => {
    STATE.tabs.push('new tab')
    STATE.activeTab = STATE.tabs.length - 1
    EVENTS.emit('touch state')
    EVENTS.emit('render')
  }

  tabsElm.append(newTabButtonElm)

  EVENTS.emit('render tab scroll')
})

EVENTS.on('new tab', () => {
  STATE.tabs.push('new tab')
  STATE.activeTab = STATE.tabs.length - 1
  EVENTS.emit('render')
  EVENTS.emit('touch state')
})

EVENTS.on('remove tab', tabIndex => {
  EVENTS.emit('touch state')
  if (STATE.tabs.length === 1) {
    STATE.tabs = []
    return EVENTS.emit('render')
  }
  if (STATE.notes.filter(note => note.t === tabIndex).length) {
    const confirmationDialogResponse = DIALOG.showMessageBoxSync({
      message: 'If you remove this tab all your notes inside of it will be removed as well.\nAre you sure you want to proceed?',
      buttons: ['Yes', 'No']
    })
    const removeConfirmed = confirmationDialogResponse === 0
    if (!removeConfirmed) return
    document.querySelectorAll(`.note[data-tab="${tabIndex}"]`).forEach(noteElm => noteElm.remove())
    STATE.notes = STATE.notes.filter(note => note.t !== tabIndex)
  }
  STATE.notes.filter(note => note.t > tabIndex).forEach(note => { note.t-- })
  STATE.tabs.splice(tabIndex, 1)
  if (STATE.activeTab > 0 && STATE.activeTab >= tabIndex) {
    STATE.activeTab--
  }
  EVENTS.emit('render')
})

EVENTS.on('switch tab', direction => {
  const tabsLength = STATE.tabs.length
  if (tabsLength === 0 || tabsLength === 1) return
  let newActiveTab = STATE.activeTab
  if (direction === 'next') {
    newActiveTab++
    if (newActiveTab === tabsLength) {
      newActiveTab = 0
    }
  } else {
    newActiveTab--
    if (newActiveTab < 0) {
      newActiveTab = tabsLength - 1
    }
  }
  STATE.activeTab = newActiveTab
  EVENTS.emit('render')
})

tabsElm.onwheel = event => tabsElm.scrollLeft += event.deltaY
tabsElm.onscroll = () => EVENTS.emit('render tab scroll')

let scrollTabsInterval = null

function scrollTabs (amount) {
  tabsElm.scrollLeft += amount
}

tabScrollLeftElm.onmouseenter = () => scrollTabsInterval = setInterval(() => scrollTabs(-10), 50)
tabScrollLeftElm.onmouseleave = () => clearInterval(scrollTabsInterval)
tabScrollRightElm.onmouseenter = () => scrollTabsInterval = setInterval(() => scrollTabs(10), 50)
tabScrollRightElm.onmouseleave = () => clearInterval(scrollTabsInterval)

hotkeys('ctrl+t,command+t', () => EVENTS.emit('new tab'))
hotkeys('ctrl+w,command+w', () => {
  if (!STATE.tabs.length) return
  EVENTS.emit('remove tab', STATE.activeTab)
})
hotkeys('ctrl+tab,command+tab', () => EVENTS.emit('switch tab', 'next'))
hotkeys('ctrl+shift+tab,command+shift+tab', () => EVENTS.emit('switch tab', 'previous'))
