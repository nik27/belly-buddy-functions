const { admin, db } = require('../utils/admin')

module.exports = (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split('Bearer ')[1]
  } else {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  admin
    .auth()
    .verifyIdToken(token)
    .then(decodedToken => {
      req.user = decodedToken
      return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get()
    })
    .then(querySnapshot => {
      req.user.handle = querySnapshot.docs[0].data().handle
      req.user.profilePicture = querySnapshot.docs[0].data().profilePicture
      req.user.name = querySnapshot.docs[0].data().name
      return next()
    })
    .catch(err => res.status(403).json(err))
}
