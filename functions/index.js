const app = require('express')()

const functions = require('firebase-functions')

const firebaseAuthorizationMiddleware = require('./utils/authMiddleware')
const { handleSignUp, handleLogin, uploadProfilePicture, createDetails, getDetails } = require('./handlers/user')
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
app.get('/user/details', firebaseAuthorizationMiddleware, getDetails)

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
