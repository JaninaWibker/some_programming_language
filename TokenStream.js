let TokenStream = function(input) {
  let _global = this
  let current = null

  Object.values = (obj) => Object.keys(obj).map(item => obj[item])

  let is = {
    keyword: (x) => Object.values(_global.keywords).indexOf(x) >= 0,
    digit: (ch) => /[0-9]/i.test(ch),
    id_start: (ch) => /[a-zλ_:]/i.test(ch),
    id: (ch) => is.id_start(ch) || '?!-<>=0123456789'.indexOf(ch) >= 0,
    op_char: (ch) => '^+-*/%=&|<>!'.indexOf(ch) >= 0,
    punc: (ch) => ',;(){}[]'.indexOf(ch) >= 0,
    whitespace: (ch) => ' \t\n'.indexOf(ch) >= 0,
  }

  let read = {
    number: () => {
      let has_dot = false
      let number = read_while((ch) => {
        if(ch == '.') {
          if(has_dot) return false
          return has_dot = true
        }
        return is.digit(ch)
      })
      return _global._AST.num(parseFloat(number)) //{ type: "num", value: parseFloat(number) }
    },
    ident: () => {
      let id = read_while(is.id)
      if(!is.keyword(id) && id.indexOf(_global.keywords.else) >= 0)
        input.croak('cannot use \'' + _global.keywords.else + '\' as variable name')
      return {
        type: is.keyword(id) ? 'kw' : 'var',
        value: id
      }
    },
    escaped: (end) => {
      let escaped = false
      let str = ''
      input.next()
      while(!input.eof()) {
        let ch = input.next()
        if(escaped) {
          str += ch
          escaped = false
        } else if(ch === '\\') {
          escaped = true
        } else if(ch === end) {
          break;
        } else {
          str += ch
        }
      }
      return str
    },
    string: () => _global._AST.str(read.escaped('"')) //({ type: 'str', value: read.escaped('"') }),
  }

  let skip_comment = () => {
    read_while((ch) => ch !== '\n')
    input.next()
  }

  let read_while = (predicate, str='') =>
    !input.eof() && predicate(input.peek())
      ? read_while(predicate, str + input.next())
      : str

  let read_next = () => {
    read_while(is.whitespace)
    if(input.eof()) return null
    let ch = input.peek()
    if(ch === _global.chars.comment) {
      skip_comment()
      return read_next()
    }
    if(ch === '"') return read.string()
    if(is.digit(ch)) return read.number()
    if(is.id_start(ch)) return read.ident()
    if(is.punc(ch)) return _global._AST.punc(input.next())
    if(is.op_char(ch)) return {
      type: 'op',
      value: read_while(is.op_char)
    }
    input.croak('can\'t handle character: ' + ch)
  }


  let peek = () => current || (current = read_next())

  let next = () => {
    let tok = current
    current = null
    return tok || read_next()
  }

  let eof = () => peek() === null

  return {
    next:  next,
    peek:  peek,
    eof:   eof,
    croak: input.croak
  }
}

module.exports = (scope) => TokenStream.bind(scope)
