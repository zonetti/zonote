window.UTIL = {}

window.UTIL.addClass = (elm, value) => {
  const classes = elm.className.split(' ')
  if (classes.includes(value)) return
  elm.className = classes.concat(value).join(' ')
}

window.UTIL.removeClass = (elm, value) => {
  const classes = elm.className.split(' ')
  if (!classes.includes(value)) return
  classes.splice(classes.indexOf(value), 1)
  elm.className = classes.join(' ')
}

window.UTIL.addClasses = (elm, values) => values.forEach(v => UTIL.addClass(elm, v))
window.UTIL.removeClasses = (elm, values) => values.forEach(v => UTIL.removeClass(elm, v))
