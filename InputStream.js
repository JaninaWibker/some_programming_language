let InputStream = function(input) {
  let pos  = 0
  let line = 1
  let col  = 0

  let next = () => {
    let ch = input.charAt(pos++)
    if (ch == '\n') {
      line++
      col = 0
    } else {
      col++
    }
    return ch
  }

  let peek = () => input.charAt(pos)

  let eof = () => peek() === ''

  let croak = (msg) => {
    throw new Error(`${msg} (${line}:${col})`)
  }

  return {
    next:  next,
    peek:  peek,
    eof:   eof,
    croak: croak
  }
}

module.exports = (scope) => InputStream.bind(scope)
