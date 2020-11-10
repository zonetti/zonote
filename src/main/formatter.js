const NOTE_MIN_WIDTH = 100
const NOTE_MIN_HEIGHT = 100
const NOTE_MAX_WIDTH = 5000
const NOTE_MAX_HEIGHT = 5000

const isTabs = /^znt-tabs\|.+/
const isNote = /^znt-note\|\d+,\d+,\d+,\d+,\d+/

const colors = ['default', 'white', 'black', 'primary', 'warning', 'danger']

function newNote ({ howManyTabs, t = 0, x = 0, y = 0, w = 500, h = 300, c = 0 }) {
  const note = {
    t: t >= 0 ? t : 0,
    x: x >= 0 ? x : 0,
    y: y >= 0 ? y : 0,
    w: w >= NOTE_MIN_WIDTH && w <= NOTE_MAX_WIDTH ? w : NOTE_MIN_WIDTH,
    h: h >= NOTE_MIN_HEIGHT && h <= NOTE_MAX_HEIGHT ? h : NOTE_MIN_HEIGHT,
    text: '',
    color: (c < 0 || c > colors.length - 1) ? colors[0] : colors[c]
  }
  if (t > 0 && (!howManyTabs || t > howManyTabs - 1)) note.t = 0
  return note
}

function fromText (text) {
  text = text.replace(/\r/g, '')

  if (typeof text !== 'string') {
    throw new Error('"text" must be a string')
  }

  let tabs = []
  const notes = []
  const lines = text.split('\n')

  let currentNote = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!line && !currentNote) continue

    if (i === 0 && isTabs.test(line)) {
      tabs = line.split('|').pop().split(',').map(tab => {
        return tab.length <= 100 ? tab : tab.substring(0, 100)
      })
      continue
    }

    if (isNote.test(line)) {
      if (currentNote) {
        notes.push(currentNote)
        currentNote = null
      }
      const [t, x, y, w, h, c] = line.split('|').pop().split(',').map(n => parseInt(n, 10))
      currentNote = newNote({ howManyTabs: tabs.length, t, x, y, w, h, c })
      continue
    }

    if (!currentNote) {
      currentNote = newNote({ howManyTabs: tabs.length })
    }

    currentNote.text += line + '\n'
  }

  if (currentNote) notes.push(currentNote)

  return { tabs, notes }
}

function toText ({ tabs, notes }) {
  let text = ''

  if (tabs.length) {
    text += 'znt-tabs|'
    tabs.forEach(tab => {
      text += `${tab},`
    })
    text = text.substring(0, text.length - 1) + '\r\n'
  }

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]
    const color = note.color || 'default'
    note.c = colors.indexOf(color)
    text += `znt-note|${note.t},${note.x},${note.y},${note.w},${note.h},${note.c}\r\n`
    text += note.text.replace(/\r/g, '').replace(/\n/g, '\r\n') + '\r\n'
  }

  return text
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { fromText, toText }
} else {
  window.fromText = fromText
  window.toText = toText
}
