const app = require('express')()

const functions = require('firebase-functions')

const { db } = require('./utils/admin')
const firebaseAuthorizationMiddleware = require('./utils/authMiddleware')

const {
  handleSignUp,
  handleLogin,
  uploadProfilePicture,
  createDetails,
  getCurrentUserDetails,
  getDetails,
  getInitialNotification,
  getNotificationRange,
  markNotificationAsRead
} = require('./handlers/user')

const {
  getInitialRecipe,
  getRecipe,
  createRecipe,
  deleteRecipe,
  createComment,
  likeRecipe,
  unlikeRecipe,
  bookmarkRecipe,
  removeBookmarkRecipe
} = require('./handlers/recipe')

// User auth routes
app.post('/signup', handleSignUp)
app.post('/login', handleLogin)

// User profile routes
app.post(
  '/user/profile-picture',
  firebaseAuthorizationMiddleware,
  uploadProfilePicture
)
app.post('/user/details', firebaseAuthorizationMiddleware, createDetails)
app.get('/user/details', firebaseAuthorizationMiddleware, getCurrentUserDetails)
app.get('/user/:handle', getDetails)

// Notification handling routes
app.get(
  '/notification',
  firebaseAuthorizationMiddleware,
  getInitialNotification
)
app.get(
  '/notification/:createdAt',
  firebaseAuthorizationMiddleware,
  getNotificationRange
)
app.post(
  '/notification/mark',
  firebaseAuthorizationMiddleware,
  markNotificationAsRead
)

// Recipe routes
app.get('/recipe', firebaseAuthorizationMiddleware, getInitialRecipe)
app.get('/recipe/:id', getRecipe)
app.post('/recipe', firebaseAuthorizationMiddleware, createRecipe)
app.delete('/recipe/:id', firebaseAuthorizationMiddleware, deleteRecipe)

// Recipe additions routes
app.get('/recipe/:id/like', firebaseAuthorizationMiddleware, likeRecipe)
app.get('/recipe/:id/unlike', firebaseAuthorizationMiddleware, unlikeRecipe)
app.get('/recipe/:id/bookmark', firebaseAuthorizationMiddleware, bookmarkRecipe)
app.get(
  '/recipe/:id/remove-bookmark',
  firebaseAuthorizationMiddleware,
  removeBookmarkRecipe
)
app.post('/recipe/:id/comment', firebaseAuthorizationMiddleware, createComment)

exports.api = functions.region('europe-west3').https.onRequest(app)

exports.onLikeNotification = functions
  .region('europe-west3')
  .firestore.document('likes/{id}')
  .onCreate(querySnapshot => {
    return db
      .doc(`/recipes/${querySnapshot.data().recipeId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${querySnapshot.id}`).set({
            recipeId: doc.id,
            type: 'like',
            read: false,
            sender: querySnapshot.data().userHandle,
            recipient: doc.data().userHandle,
            createdAt: new Date().toISOString()
          })
        }
      })
      .catch(err => {
        console.log(err)
      })
  })

exports.onUnlikeRemoveNotification = functions
  .region('europe-west3')
  .firestore.document('likes/{id}')
  .onDelete(querySnapshot => {
    return db
      .doc(`/notifications/${querySnapshot.id}`)
      .delete()
      .catch(err => {
        console.log(err)
      })
  })

exports.onCommentNotification = functions
  .region('europe-west3')
  .firestore.document('comments/{id}')
  .onCreate(querySnapshot => {
    return db
      .doc(`/recipes/${querySnapshot.data().recipeId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${querySnapshot.id}`).set({
            recipeId: doc.id,
            type: 'comment',
            read: false,
            sender: querySnapshot.data().userHandle,
            recipient: doc.data().userHandle,
            createdAt: new Date().toISOString()
          })
        }
      })
      .catch(err => {
        console.log(err)
      })
  })

exports.onBookmarkNotification = functions
  .region('europe-west3')
  .firestore.document('bookmarks/{id}')
  .onCreate(querySnapshot => {
    return db
      .doc(`/recipes/${querySnapshot.data().recipeId}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          return db.doc(`/notifications/${querySnapshot.id}`).set({
            recipeId: doc.id,
            type: 'bookmark',
            read: false,
            sender: querySnapshot.data().userHandle,
            recipient: doc.data().userHandle,
            createdAt: new Date().toISOString()
          })
        }
      })
      .catch(err => {
        console.log(err)
      })
  })

exports.onBookmarkRemoveNotification = functions
  .region('europe-west3')
  .firestore.document('bookmarks/{id}')
  .onDelete(querySnapshot => {
    return db
      .doc(`/bookmarks/${querySnapshot.id}`)
      .delete()
      .catch(err => {
        console.log(err)
      })
  })

exports.onProfiePictureChange = functions
  .region('europe-west3')
  .firestore.document('users/{id}')
  .onUpdate(change => {
    if (
      change.before.data().profilePicture !== change.after.data().profilePicture
    ) {
      const batch = db.batch()

      return db
        .collection('recipes')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then(querySnapshot => {
          querySnapshot.forEach(doc =>
            batch.update(db.doc(`/recipes/${doc.id}`), {
              profilePicture: change.after.data().profilePicture
            })
          )
        })
        .then(() => {
          return db
            .collection('comments')
            .where('userHandle', '==', change.before.data().handle)
            .get()
            .then(querySnapshot => {
              querySnapshot.forEach(doc =>
                batch.update(db.doc(`/comments/${doc.id}`), {
                  profilePicture: change.after.data().profilePicture
                })
              )
              return batch.commit()
            })
        })
        .catch(err => {
          console.log(err)
        })
    } else {
      return true
    }
  })

exports.onRecipeDelete = functions
  .region('europe-west3')
  .firestore.document('/recipes/{id}')
  .onDelete((snapshot, context) => {
    const id = context.params.id
    const batch = db.batch()

    return db
      .collection('comments')
      .where('recipeId', '==', id)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc =>
          batch.delete(db.doc(`/comments/${doc.id}`))
        )
        return db.collection('likes').where('recipeId', '==', id).get()
      })
      .then(querySnapshot => {
        querySnapshot.forEach(doc => batch.delete(db.doc(`/likes/${doc.id}`)))
        return db.collection('bookmarks').where('recipeId', '==', id).get()
      })
      .then(querySnapshot => {
        querySnapshot.forEach(doc =>
          batch.delete(db.doc(`/bookmarks/${doc.id}`))
        )
        return db.collection('notifications').where('recipeId', '==', id).get()
      })
      .then(querySnapshot => {
        querySnapshot.forEach(doc =>
          batch.delete(db.doc(`/notifications/${doc.id}`))
        )
        return batch.commit()
      })
      .catch(err => {
        console.log(err)
      })
  })
