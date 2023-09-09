const validationEmail = (email) => {
  const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<;>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

const validationPassword = (password) => {
  const regex = /^(?=.{8,16}$)(?=[^A-Za-z]*[A-Za-z])(?=[^\d]*\d).*/;
  if (regex.test(String(password))) return 'Valid';
  else {
    if (password.length < 8) return 'La contraseña es demasiado corta (8 carácteres mínimo)'
    else if (!/[A-Za-z]/.test(String(password))) return 'La contraseña necesita una letra mínimo'
    else if (!/\d/.test(String(password))) return 'La contraseña necesita un numero mínimo'
  }
}

module.exports = {validationEmail, validationPassword};  