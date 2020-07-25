const md5 = require('crypto-js/md5')

const { admin, db, firebase } = require('../utils/admin')
const {
  loginValidator,
  signUpValidator,
  detailsValidator
} = require('../utils/validators')
const config = require('../firebaseconf.js')

exports.handleSignUp = (req, res) => {
  const user = { ...req.body }
  let userId
  let token

  const { errors, valid } = signUpValidator(user)

  if (!valid) {
    return res.status(400).json(errors)
  }

  db.doc(`/users/${user.handle}`)
    .get()
    .then(documentSnapshot => {
      if (documentSnapshot.exists) {
        return res.status(400).json({ handle: 'Handle already in use :(' })
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(user.email, user.password)
      }
    })
    .then(data => {
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then(userToken => {
      token = userToken
    })
    .then(() => md5(user.email).toString())
    .then(emailHash => {
      const credentials = {
        userId,
        createdAt: new Date().toISOString(),
        email: user.email,
        handle: user.handle,
        imgUrl: `https://gravatar.com/avatar/${emailHash}?d=identicon`
      }
      return db.doc(`/users/${user.handle}`).set(credentials)
    })
    .then(() => res.status(201).json({ token }))
    .catch(err => {
      if (err.code === 'auth/email-already-in-use') {
        res.status(400).json({ email: 'Email already in use :(' })
      } else {
        res.status(500).json({ error: err.code })
      }
    })
}

exports.handleLogin = (req, res) => {
  const user = { ...req.body }

  const { errors, valid } = loginValidator(user)

  if (!valid) {
    return res.status(403).json(errors)
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => data.user.getIdToken())
    .then(token => res.json({ token }))
    // eslint-disable-next-line handle-callback-err
    .catch(err => {
      return res.status(403).json({ general: 'Wrong credentials' })
    })
}

exports.uploadProfilePicture = (req, res) => {
  const Busboy = require('busboy')
  const path = require('path')
  const fs = require('fs')
  const os = require('os')

  const busboy = new Busboy({ headers: req.headers })
  let imgFilename
  let img = {}

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
      return res.status(400).json({ error: 'Wrong filetype' })
    }

    const imgExt = filename.split('.').pop()
    imgFilename = `profile-${req.user.uid}.${imgExt}`

    const dirPath = `users/${req.user.uid}/${imgFilename}`
    const filePath = path.join(os.tmpdir(), imgFilename)

    img = { dirPath, filePath, mimetype }

    file.pipe(fs.createWriteStream(filePath))
  })

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(img.filePath, {
        destination: img.dirPath,
        resumable: false,
        metadata: {
          contentType: img.mimetype
        }
      })
      .then(() => {
        const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/users%2F${req.user.uid}%2F${imgFilename}?alt=media`
        return db.doc(`/users/${req.user.handle}`).update({ imgUrl })
      })
      .then(() => res.json({ message: 'Image uploaded successfully' }))
      .catch(err => res.status(500).json({ error: err.code }))
  })

  busboy.end(req.rawBody)
}

exports.createDetails = (req, res) => {
  const { validatedData, valid } = detailsValidator(req.body)

  if (valid) {
    db.doc(`/users/${req.user.handle}`)
      .update(validatedData)
      .then(() =>
        res.status(201).json({ message: 'Details added successfully' })
      )
      .catch(err => res.status(500).json({ error: err.code }))
  } else {
    return res.status(400).json({ message: 'No data to add' })
  }
}

exports.getCurrentUserDetails = (req, res) => {
  const user = { likes: [], notifications: [] }

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        user.credentials = doc.data()
        return db
          .collection('likes')
          .where('userHandle', '==', req.user.handle)
          .get()
      }
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => user.likes.push(doc.data()))
      return db
        .collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc =>
        user.notifications.push({ id: doc.id, ...doc.data() })
      )
      return res.status(200).json(user)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getDetails = (req, res) => {
  const userDetails = { recipes: [] }

  db.doc(`/users/${req.params.handle}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' })
      }

      userDetails.user = doc.data()
      return db
        .collection('recipes')
        .where('userHandle', '==', req.params.handle)
        .orderBy('createdAt', 'desc')
        .get()
        .then(querySnapshot => {
          querySnapshot.forEach(doc =>
            userDetails.recipes.push({ id: doc.id, ...doc.data() })
          )
          return res.status(200).json(userDetails)
        })
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getInitialNotification = (req, res) => {
  const notifications = []

  db.collection('notifications')
    .where('recipient', '==', req.user.handle)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        notifications.push({ id: doc.id, ...doc.data() })
      })
      return res.status(200).json(notifications)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getNotificationRange = (req, res) => {
  const notifications = []
  const lastNotificationDate = req.params.createdAt

  db.collection('notifications')
    .where('recipient', '==', req.user.handle)
    .where('createdAt', '<', lastNotificationDate)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        notifications.push({ id: doc.id, ...doc.data() })
      })
      return res.status(200).json(notifications)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.markNotificationAsRead = (req, res) => {
  const batch = db.batch()

  req.body.forEach(id =>
    batch.update(db.doc(`/notifications/${id}`), { read: true })
  )

  batch
    .commit()
    .then(() => res.status(200).json({ message: 'Notifications read' }))
    .catch(err => res.status(500).json({ error: err }))
}
