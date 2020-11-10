const shortid = require('shortid')
const marked = require('marked')

marked.setOptions({
  breaks: true,
  gfm: true,
  smartypants: true
})

const contentElm = document.getElementById('content')
const editMessageElm = document.getElementById('edit-message')
const backMessageElm = document.getElementById('back-message')
const removeNoteElm = document.getElementById('remove-note')
const colorPickerElm = document.getElementById('color-picker')

function generateId () {
  const id = shortid().replace(/\W/g, '') + new Date().getTime()
  return id.split('').sort(() => 0.5 - Math.random()).join('')
}

let editMessageTimeout = null

EVENTS.on('render', () => {
  editMessageElm.style.display = 'none'

  const visibleNotes = STATE.notes.filter(note => note.t === STATE.activeTab)
  backMessageElm.style.display = visibleNotes.length ? 'none' : 'block'
  contentElm.style.top = TOP_OFFSET() + 'px'

  document.querySelectorAll('.note').forEach(e => {
    if (e.isSameNode(GUI_STATE.elementBeingDraggedElm)) return
    e.remove()
  })

  STATE.notes.forEach(note => {
    EVENTS.emit('render note', note)
  })
})

function enableResizing (noteElm) {
  let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight

  function resize (resizerClass) {
    return function (event) {
      if (['resizer-right', 'resizer-both'].includes(resizerClass)) {
        let resizeAmount = resizeStartWidth + event.pageX - resizeStartX
        if (resizeAmount < NOTE_MIN_WIDTH) {
          resizeAmount = NOTE_MIN_WIDTH
        }
        GET_NOTE_BY_ID(GUI_STATE.elementBeingResizedElm.dataset.id).w = resizeAmount
        GUI_STATE.elementBeingResizedElm.style.width = resizeAmount + 'px'
      }
      if (['resizer-bottom', 'resizer-both'].includes(resizerClass)) {
        let resizeAmount = resizeStartHeight + event.pageY - resizeStartY
        if (resizeAmount < NOTE_MIN_HEIGHT) {
          resizeAmount = NOTE_MIN_HEIGHT
        }
        GET_NOTE_BY_ID(GUI_STATE.elementBeingResizedElm.dataset.id).h = resizeAmount
        GUI_STATE.elementBeingResizedElm.style.height = resizeAmount + 'px'
      }
    }
  }
  
  function stopResizing () {
    GUI_STATE.isResizing = false
    UTIL.removeClass(GUI_STATE.elementBeingResizedElm, 'selected')
    GUI_STATE.elementBeingResizedElm = null
    document.documentElement.onmousemove = null
    document.documentElement.onmouseup = null
    EVENTS.emit('touch state')
    EVENTS.emit('render')
  }
  
  function startResizing (event) {
    EVENTS.emit('hide menu')
    event.stopPropagation()
    GUI_STATE.isResizing = true
    GUI_STATE.elementBeingResizedElm = this.parentNote
    resizeStartX = event.pageX
    resizeStartWidth = parseInt(document.defaultView.getComputedStyle(GUI_STATE.elementBeingResizedElm).width, 10)
    resizeStartY = event.pageY
    resizeStartHeight = parseInt(document.defaultView.getComputedStyle(GUI_STATE.elementBeingResizedElm).height, 10)
    UTIL.addClass(GUI_STATE.elementBeingResizedElm, 'selected')
    document.documentElement.onmousemove = resize(this.className)
    document.documentElement.onmouseup = stopResizing
  }

  const rightElm = document.createElement('div')
  rightElm.className = 'resizer-right'
  noteElm.appendChild(rightElm)
  rightElm.onmousedown = startResizing
  rightElm.parentNote = noteElm

  const bottomElm = document.createElement('div')
  bottomElm.className = 'resizer-bottom'
  noteElm.appendChild(bottomElm)
  bottomElm.onmousedown = startResizing
  bottomElm.parentNote = noteElm
  
  const bothElm = document.createElement('div')
  bothElm.className = 'resizer-both'
  noteElm.appendChild(bothElm)
  bothElm.onmousedown = startResizing
  bothElm.parentNote = noteElm
}

function enableDragging (noteElm) {
  const draggingMouseDifference = [0, 0]
  
  function dragElement (event) {
    if (!GUI_STATE.elementBeingDraggedElm)  return
    event = event || window.event
    let noteNewPosition = [
      event.pageX + draggingMouseDifference[0],
      event.pageY - TOP_OFFSET() + draggingMouseDifference[1]
    ]
    if (noteNewPosition[0] <= CANVAS_PADDING()) {
      noteNewPosition[0] = CANVAS_PADDING()
    }
    if (noteNewPosition[1] <= CANVAS_PADDING()) {
      noteNewPosition[1] = CANVAS_PADDING()
    }
    const note = GET_NOTE_BY_ID(GUI_STATE.elementBeingDraggedElm.dataset.id)
    note.x = noteNewPosition[0] - CANVAS_PADDING()
    note.y = noteNewPosition[1] - CANVAS_PADDING()
    GUI_STATE.elementBeingDraggedElm.style.left = noteNewPosition[0] + 'px'
    GUI_STATE.elementBeingDraggedElm.style.top = noteNewPosition[1] + 'px'
    UTIL.addClass(GUI_STATE.elementBeingDraggedElm, 'selected')
    if (STATE.isInRemoveNoteArea) {
      UTIL.addClass(GUI_STATE.elementBeingDraggedElm, 'remove')
    } else {
      UTIL.removeClass(GUI_STATE.elementBeingDraggedElm, 'remove')
    }
  }
  
  function stopDragging () {
    if (STATE.isInRemoveNoteArea) {
      const confirmationDialogResponse = DIALOG.showMessageBoxSync({
        message: 'Are you sure you want to remove this note?',
        buttons: ['Yes', 'No']
      })
      const removeConfirmed = confirmationDialogResponse === 0
      if (removeConfirmed) {
        const noteIdToRemove = GUI_STATE.elementBeingDraggedElm.dataset.id
        let noteIndex = 0
        for (let i = 0; i < STATE.notes.length; i++) {
          if (STATE.notes[i].id !== noteIdToRemove) continue
          noteIndex = i
          break
        }
        STATE.notes.splice(noteIndex, 1)
        GUI_STATE.elementBeingDraggedElm.remove()
        EVENTS.emit('render')
      }
    }
    UTIL.removeClasses(GUI_STATE.elementBeingDraggedElm, ['selected', 'remove'])
    GUI_STATE.isDragging = false
    removeNoteElm.style.opacity = 0
    GUI_STATE.elementBeingDraggedElm = null
    document.onmouseup = null
    document.onmousemove = null
    EVENTS.emit('touch state')
    EVENTS.emit('render')
  }

  function startDragging (event) {
    EVENTS.emit('hide menu')
    GUI_STATE.elementBeingDraggedElm = this
    GUI_STATE.elementBeingDraggedElm.style.zIndex = NEXT_ZINDEX()
    removeNoteElm.style.zIndex = NEXT_ZINDEX()
    event = event || window.event
    draggingMouseDifference[0] = GUI_STATE.elementBeingDraggedElm.offsetLeft - event.pageX
    draggingMouseDifference[1] = GUI_STATE.elementBeingDraggedElm.offsetTop - (event.pageY - TOP_OFFSET())
    GUI_STATE.isDragging = true
    UTIL.addClass(GUI_STATE.elementBeingDraggedElm, 'selected')
    removeNoteElm.style.opacity = 1
    removeNoteElm.style.top = (TOP_OFFSET() + removeNoteElm.offsetHeight) + 'px'
    document.onmouseup = stopDragging
    document.onmousemove = dragElement
  }

  noteElm.onmousedown = startDragging
}

EVENTS.on('render note text', (note, noteElm) => {
  const noteTextElm = document.createElement('div')
  noteTextElm.className = 'text'
  noteTextElm.innerHTML = marked(note.text)
  noteTextElm.onclick = event => {
    EVENTS.emit('hide menu')
    event.stopPropagation()
  }
  noteTextElm.ondblclick = () => {
    EVENTS.emit('hide menu')
    note.isEditing = true
    editMessageElm.style.display = 'none'
    EVENTS.emit('render note', note)
  }
  noteTextElm.onmouseenter = function () {
    this.style.userSelect = 'text'
    editMessageElm.style.display = 'block'
    editMessageElm.style.top = (noteElm.offsetTop + noteElm.offsetHeight - 15) + 'px'
    editMessageElm.style.left = (noteElm.offsetLeft + (noteElm.offsetWidth / 2) - (editMessageElm.offsetWidth / 2)) + 'px'
    editMessageElm.style.zIndex = '' + (parseInt(noteElm.style.zIndex, 10) + 5)
    clearTimeout(editMessageTimeout)
    editMessageTimeout = setTimeout(() => {
      editMessageElm.style.display = 'none'
    }, 1000)
  }
  noteTextElm.onmouseleave = function () {
    this.style.userSelect = 'none'
    editMessageElm.style.display = 'none'
  }
  noteTextElm.onmousedown = event => event.stopPropagation()
  noteTextElm.onmouseout = event => event.stopPropagation()
  noteTextElm.querySelectorAll('a').forEach(linkElm => {
    linkElm.onclick = event => {
      event.preventDefault()
      require('electron').shell.openExternal(event.target.href)
    }
  })
  noteElm.appendChild(noteTextElm)
})

EVENTS.on('render note', note => {
  if (!note.id) {
    note.id = generateId()
  }

  let noteElm = document.querySelector(`.note[data-id="${note.id}"]`)

  if (noteElm && !noteElm.isSameNode(GUI_STATE.elementBeingDraggedElm)) {
    noteElm.remove()
    noteElm = null
  }

  if (note.t !== STATE.activeTab) return

  if (!noteElm) {
    noteElm = document.createElement('div')
  }

  noteElm.dataset.id = note.id
  noteElm.dataset.tab = note.t
  noteElm.className = 'note ' + (note.color || 'default')
  noteElm.style.display = note.t === STATE.activeTab ? 'block' : 'none'
  noteElm.style.top = note.y + CANVAS_PADDING() + 'px'
  noteElm.style.left = note.x + CANVAS_PADDING() + 'px'
  noteElm.style.width = note.w + 'px'
  noteElm.style.height = note.h + 'px'
  noteElm.style.zIndex = NEXT_ZINDEX()
  
  enableResizing(noteElm)
  enableDragging(noteElm)

  noteElm.ondblclick = event => event.stopPropagation()
  noteElm.onmouseenter = function (event) {
    if (GUI_STATE.isDragging || GUI_STATE.isResizing) return
    this.style.zIndex = NEXT_ZINDEX()
  }

  if (note.isEditing) {
    const noteTextareaElm = document.createElement('textarea')
    noteTextareaElm.onblur = function () {
      delete note.isEditing
      this.remove()
      EVENTS.emit('render note text', note, noteElm)
    }
    noteTextareaElm.onclick = event => event.stopPropagation()
    noteTextareaElm.onmousedown = event => event.stopPropagation()
    noteTextareaElm.onkeydown = function (event) {
      if (event.keyCode === KEY_ESC) return EVENTS.emit('render note', note)
      if (event.keyCode === KEY_TAB) {
        event.preventDefault()
        const selectionStart = this.selectionStart
        this.value = this.value.substring(0, selectionStart) + '  ' + this.value.substring(this.selectionEnd)
        this.selectionEnd = selectionStart + 2
      }
      note.text = this.value
      EVENTS.emit('touch state')
    }
    noteTextareaElm.oninput = function (event) {
      note.text = this.value
      EVENTS.emit('touch state')
    }
    noteElm.appendChild(noteTextareaElm)
    setTimeout(() => {
      noteTextareaElm.value = note.text
      noteTextareaElm.focus()
    }, 0)
  } else if (!noteElm.isSameNode(GUI_STATE.elementBeingDraggedElm)) {
    EVENTS.emit('render note text', note, noteElm)
  }

  noteElm.addEventListener('contextmenu', e => {
    e.preventDefault()
    colorPickerElm.style.display = 'block'
    colorPickerElm.style.top = (e.pageY - 15) + 'px'
    colorPickerElm.style.left = (e.pageX - 15) + 'px'
    colorPickerElm.style.zIndex = NEXT_ZINDEX()
    GUI_STATE.noteRightClicked = note
  })

  contentElm.appendChild(noteElm)
})

removeNoteElm.onmouseenter = () => { STATE.isInRemoveNoteArea = true }
removeNoteElm.onmouseleave = () => { STATE.isInRemoveNoteArea = false }

function hideColorPicker () {
  colorPickerElm.style.display = 'none'
  GUI_STATE.noteRightClicked = null
}

colorPickerElm.onmouseleave = hideColorPicker

colorPickerElm.querySelectorAll('span').forEach(spanElm => {
  spanElm.onclick = e => {
    e.preventDefault()
    GUI_STATE.noteRightClicked.color = spanElm.className.split(' ')[0]
    EVENTS.emit('touch state')
    hideColorPicker()
  }
})

contentElm.ondblclick = event => {
  const newNote = {
    t: STATE.activeTab,
    x: event.pageX - CANVAS_PADDING(),
    y: event.pageY - TOP_OFFSET() - CANVAS_PADDING(),
    w: 200,
    h: 200,
    text: '',
    isEditing: true,
    color: 'default'
  }
  if (newNote.x < 0) newNote.x = 0
  if (newNote.y < 0) newNote.y = 0
  STATE.notes.push(newNote)
  EVENTS.emit('touch state')
  EVENTS.emit('render')
}
