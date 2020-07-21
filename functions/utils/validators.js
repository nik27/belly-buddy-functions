const validator = require('validator')

exports.signUpValidator = data => {
  const errors = {}

  if (validator.isEmpty(data.email, { ignore_whitespace: true })) {
    errors.email = 'Must not be empty'
  } else if (!validator.isEmail(data.email)) {
    errors.email = 'Must be valid email address'
  }

  if (validator.isEmpty(data.handle, { ignore_whitespace: true })) {
    errors.handle = 'Must not be empty'
  }

  if (validator.isEmpty(data.password, { ignore_whitespace: true })) {
    errors.password = 'Must not be empty'
  }

  if (data.password !== data.confirmPassword) {
    errors.password = 'Passwords must match'
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0
  }
}

exports.loginValidator = data => {
  const errors = {}

  if (validator.isEmpty(data.email, { ignore_whitespace: true })) {
    errors.email = 'Must not be empty'
  } else if (!validator.isEmail(data.email)) {
    errors.email = 'Must be valid email address'
  }

  if (validator.isEmpty(data.password, { ignore_whitespace: true })) {
    errors.password = 'Must not be empty'
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0
  }
}

exports.detailsValidator = data => {
  const validatedData = {}

  if (!validator.isEmpty((data.bio), { ignore_whitespace: true })) {
    validatedData.bio = data.bio.trim()
  }

  if (!validator.isEmpty(data.website, { ignore_whitespace: true })) {
    if (data.website.trim().substring(0, 4) === 'http') {
      if (validator.isFQDN(new URL(data.website.trim()).hostname)) {
        validatedData.website = data.website.trim()
      }
    } else {
      if (validator.isFQDN(data.website.trim())) {
        validatedData.website = `http://${data.website.trim()}`
      }
    }
  }

  return {
    validatedData,
    valid: Object.keys(validatedData).length !== 0
  }
}

exports.commentValidator = data => {
  const validatedComment = {}

  if (!validator.isEmpty(data.body, { ignore_whitespace: true })) {
    validatedComment.body = data.body
  }

  return {
    validatedComment,
    valid: Object.keys(validatedComment).length !== 0
  }
}
