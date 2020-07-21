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
  markNotificationAsRead
} = require('./handlers/user')

const {
  getAllRecipes,
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
app.post('/user/profile-picture', firebaseAuthorizationMiddleware, uploadProfilePicture)
app.post('/user/details', firebaseAuthorizationMiddleware, createDetails)
app.get('/user/details', firebaseAuthorizationMiddleware, getCurrentUserDetails)
app.get('/user/:handle', getDetails)
app.post('/notifications/mark', firebaseAuthorizationMiddleware, markNotificationAsRead)

// Recipe routes
app.get('/recipe', firebaseAuthorizationMiddleware, getAllRecipes)
app.get('/recipe/:id', getRecipe)
app.post('/recipe', firebaseAuthorizationMiddleware, createRecipe)
app.delete('/recipe/:id', firebaseAuthorizationMiddleware, deleteRecipe)

// Recipe additions routes
app.get('/recipe/:id/like', firebaseAuthorizationMiddleware, likeRecipe)
app.get('/recipe/:id/unlike', firebaseAuthorizationMiddleware, unlikeRecipe)
app.get('/recipe/:id/bookmark', firebaseAuthorizationMiddleware, bookmarkRecipe)
app.get('/recipe/:id/remove-bookmark', firebaseAuthorizationMiddleware, removeBookmarkRecipe)
app.post('/recipe/:id/comment', firebaseAuthorizationMiddleware, createComment)

exports.api = functions.region('europe-west3').https.onRequest(app)

exports.onLikeNotification = functions.region('europe-west3').firestore.document('likes/{id}')
  .onCreate(querySnapshot => {
    db.doc(`/recipes/${querySnapshot.data().recipeId}`).get()
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
      .catch(err => { console.log(err) })
  })

exports.onUnlikeRemoveNotification = functions.region('europe-west3').firestore.document('likes/{id}')
  .onDelete(querySnapshot => {
    db.doc(`/notifications/${querySnapshot.id}`)
      .delete()
      .catch(err => { console.log(err) })
  })

exports.onCommentNotification = functions.region('europe-west3').firestore.document('comments/{id}')
  .onCreate(querySnapshot => {
    db.doc(`/recipes/${querySnapshot.data().recipeId}`).get()
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
      .catch(err => { console.log(err) })
  })

exports.onBookmarkNotification = functions.region('europe-west3').firestore.document('bookmarks/{id}')
  .onCreate(querySnapshot => {
    db.doc(`/recipes/${querySnapshot.data().recipeId}`).get()
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
      .catch(err => { console.log(err) })
  })

exports.onBookmarkRemoveNotification = functions.region('europe-west3').firestore.document('bookmarks/{id}')
  .onDelete(querySnapshot => {
    db.doc(`/bookmarks/${querySnapshot.id}`)
      .delete()
      .catch(err => { console.log(err) })
  })
