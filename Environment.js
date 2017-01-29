class Environment {
  constructor(parent) {
    this.vars = Object.create(parent ? parent.vars : null)
    this.parent = parent
  }
  extend() {
    return new Environment(this)
  }

  lookup(name) {
    let scope = this
    while(scope) {
      if(Object.hasOwnProperty.call(scope.vars, name))
        return scope
      scope = scope.parent
    }
  }

  get(name) {
    if(name in this.vars) // cannot use Object.keys; does not seem to work for some reason idk 
      return this.vars[name]
    throw new Error('undefined variable ' + name)
  }

  set(name, value) {
    let scope = this.lookup(name)
    if(!scope && this.parent)
      throw new Error('undefined variable ' + name)
    return (scope || this).vars[name] = value
  }
  def(name, value) {
    this.vars[name] = value
  }
  _def(obj) {
    Object.keys(obj).forEach((item) => {
      this.vars[item] = obj[item]
    })
  }
}

module.exports = Environment
