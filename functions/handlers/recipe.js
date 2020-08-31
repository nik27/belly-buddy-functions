const { admin, db } = require('../utils/admin')
const config = require('../firebaseconf.js')
const { uuid } = require('uuidv4')

const { commentValidator } = require('../utils/validators')

exports.getRecipe = (req, res) => {
  let recipe

  db.doc(`/recipes/${req.params.id}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ message: 'Recipe not found' })
      }

      recipe = doc.data()
      recipe.id = doc.id
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('recipeId', '==', req.params.id)
        .get()
    })
    .then(querySnapshot => {
      recipe.comments = []

      querySnapshot.forEach(doc => {
        recipe.comments.push({ id: doc.id, ...doc.data() })
      })
      return res.status(200).json(recipe)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getInitialTimelineRecipe = (req, res) => {
  const handle = req.user.handle
  const follows = []

  db.collection('follows')
    .where('userHandle', '==', handle)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        follows.push(doc.data().follows)
      })

      return db.collection('recipes').orderBy('createdAt', 'desc').get()
    })
    .then(querySnapshot => {
      const recipes = []
      querySnapshot.forEach(doc => {
        if (recipes.length < 10 && follows.includes(doc.data().userHandle)) {
          recipes.push({ id: doc.id, ...doc.data() })
        }
      })

      return res.json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getTimelineRecipeRange = (req, res) => {
  const recipes = []
  const lastRecipeDate = req.params.createdAt
  const handle = req.user.handle
  const follows = []

  db.collection('follows')
    .where('userHandle', '==', handle)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        follows.push(doc.data().follows)
      })

      return db
        .collection('recipes')
        .where('createdAt', '<', lastRecipeDate)
        .orderBy('createdAt', 'desc')
        .get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        if (recipes.length < 10 && follows.includes(doc.data().userHandle)) {
          recipes.push({ id: doc.id, ...doc.data() })
        }
      })
      return res.status(200).json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getInitialBookmarkRecipe = (req, res) => {
  const handle = req.user.handle
  const bookmarks = []

  db.collection('bookmarks')
    .where('userHandle', '==', handle)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        bookmarks.push(doc.data().recipeId)
      })

      return db.collection('recipes').orderBy('createdAt', 'desc').get()
    })
    .then(querySnapshot => {
      const recipes = []
      querySnapshot.forEach(doc => {
        if (recipes.length < 10 && bookmarks.includes(doc.id)) {
          recipes.push({ id: doc.id, ...doc.data() })
        }
      })

      return res.json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getBookmarkRecipeRange = (req, res) => {
  const recipes = []
  const lastRecipeDate = req.params.createdAt
  const handle = req.user.handle
  const bookmarks = []

  db.collection('bookmarks')
    .where('userHandle', '==', handle)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        bookmarks.push(doc.data().recipeId)
      })

      return db
        .collection('recipes')
        .where('createdAt', '<', lastRecipeDate)
        .orderBy('createdAt', 'desc')
        .get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        if (recipes.length < 10 && bookmarks.includes(doc.id)) {
          recipes.push({ id: doc.id, ...doc.data() })
        }
      })
      return res.status(200).json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getInitialExploreRecipe = (req, res) => {
  const handle = req.user.handle
  const follows = []

  db.collection('follows')
    .where('userHandle', '==', handle)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        follows.push(doc.data().follows)
      })

      return db.collection('recipes').orderBy('createdAt', 'desc').get()
    })
    .then(querySnapshot => {
      const recipes = []
      querySnapshot.forEach(doc => {
        if (
          recipes.length < 10 &&
          doc.data().userHandle !== handle &&
          !follows.includes(doc.data().userHandle)
        ) {
          recipes.push({ id: doc.id, ...doc.data() })
        }
      })

      return res.json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getExploreRecipeRange = (req, res) => {
  const recipes = []
  const lastRecipeDate = req.params.createdAt
  const handle = req.user.handle
  const follows = []

  db.collection('follows')
    .where('userHandle', '==', handle)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        follows.push(doc.data().follows)
      })

      return db
        .collection('recipes')
        .where('createdAt', '<', lastRecipeDate)
        .orderBy('createdAt', 'desc')
        .get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        if (
          recipes.length < 10 &&
          doc.data().userHandle !== handle &&
          !follows.includes(doc.data().userHandle)
        ) {
          recipes.push({ id: doc.id, ...doc.data() })
        }
      })
      return res.status(200).json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.createRecipe = (req, res) => {
  const tempTag = req.body.tags
  const tags = []

  const newRecipe = {
    userHandle: req.user.handle,
    userName: req.user.name,
    body: {
      title: req.body.title,
      time: req.body.time,
      portions: req.body.portions,
      intro: req.body.intro,
      steps: req.body.steps,
      tips: req.body.tips,
      ingredients: req.body.ingredients
    },
    mainPicture: req.body.mainPicture,
    pictures: req.body.pictures,
    profilePicture: req.user.profilePicture,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    createdAt: new Date().toISOString()
  }

  db.collection('tags')
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        if (tempTag.includes(doc.data().value)) {
          tags.push({ id: doc.id, ...doc.data() })
        }
      })

      return db.collection('recipes').add({ ...newRecipe, tags: tags })
    })
    .then(doc => res.status(201).json({ id: doc.id, ...newRecipe }))
    .catch(err => res.status(500).json({ error: err }))
}

exports.deleteRecipe = (req, res) => {
  const recipe = db.doc(`/recipes/${req.params.id}`)

  recipe
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Recipe not found' })
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized' })
      } else {
        return recipe.delete()
      }
    })
    .then(() =>
      res.status(200).json({ message: 'Recipe deleted successfully' })
    )
    .catch(err => res.status(500).json({ error: err }))
}

exports.createComment = (req, res) => {
  const { validatedComment, valid } = commentValidator(req.body)

  if (!valid) {
    return res.status(400).json({ comment: 'Must not be empty' })
  }
  const comment = {
    recipeId: req.params.id,
    createdAt: new Date().toISOString(),
    userHandle: req.user.handle,
    userName: req.user.name,
    profilePicture: req.user.profilePicture,
    body: validatedComment.body
  }
  db.doc(`/recipes/${req.params.id}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        res.status(404).json({ error: 'Recipe not found' })
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 })
    })
    .then(() => db.collection('comments').add(comment))
    .then(() => res.status(201).json(comment))
    .catch(err => res.status(500).json({ error: err }))
}

exports.likeRecipe = (req, res) => {
  const likeDocRef = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.id)
    .limit(1)
  const recipeDocRef = db.doc(`/recipes/${req.params.id}`)

  let recipe

  recipeDocRef
    .get()
    .then(doc => {
      if (doc.exists) {
        recipe = { id: doc.id, ...doc.data() }

        if (recipe.userHandle === req.user.handle) {
          return res
            .status(400)
            .json({ error: "You can't like your own recipe" })
        } else {
          return likeDocRef.get()
        }
      } else {
        return res.status(404).json({ error: 'Recipe not found' })
      }
    })
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return db
          .collection('likes')
          .add({ recipeId: recipe.id, userHandle: req.user.handle })
          .then(() => {
            recipe.likeCount++
            return recipeDocRef.update({ likeCount: recipe.likeCount })
          })
          .then(() => res.status(201).json(recipe))
      } else {
        return res.status(400).json({ error: 'Recipe already liked' })
      }
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.unlikeRecipe = (req, res) => {
  const likeDocRef = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.id)
    .limit(1)
  const recipeDocRef = db.doc(`/recipes/${req.params.id}`)

  let recipe

  recipeDocRef
    .get()
    .then(doc => {
      if (doc.exists) {
        recipe = { id: doc.id, ...doc.data() }

        if (recipe.userHandle === req.user.handle) {
          return res
            .status(400)
            .json({ error: "You can't unlike your own recipe" })
        } else {
          return likeDocRef.get()
        }
      } else {
        return res.status(404).json({ error: 'Recipe not found' })
      }
    })
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        return db
          .doc(`/likes/${querySnapshot.docs[0].id}`)
          .delete()
          .then(() => {
            recipe.likeCount--
            return recipeDocRef.update({ likeCount: recipe.likeCount })
          })
          .then(() => res.status(200).json(recipe))
      } else {
        return res.status(400).json({ error: 'Recipe not liked' })
      }
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.bookmarkRecipe = (req, res) => {
  const bookmarkDocRef = db
    .collection('bookmarks')
    .where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.id)
    .limit(1)
  const recipeDocRef = db.doc(`/recipes/${req.params.id}`)

  let recipe

  recipeDocRef
    .get()
    .then(doc => {
      if (doc.exists) {
        recipe = { id: doc.id, ...doc.data() }

        if (recipe.userHandle === req.user.handle) {
          return res
            .status(400)
            .json({ error: "You can't bookmark your own recipe" })
        } else {
          return bookmarkDocRef.get()
        }
      } else {
        return res.status(404).json({ error: 'Recipe not found' })
      }
    })
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        return db
          .collection('bookmarks')
          .add({ recipeId: recipe.id, userHandle: req.user.handle })
          .then(() => {
            recipe.bookmarkCount++
            return recipeDocRef.update({ bookmarkCount: recipe.bookmarkCount })
          })
          .then(() => res.status(201).json(recipe))
      } else {
        return res.status(400).json({ error: 'Recipe already bookmarked' })
      }
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.removeBookmarkRecipe = (req, res) => {
  const bookmarkDocRef = db
    .collection('bookmarks')
    .where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.id)
    .limit(1)
  const recipeDocRef = db.doc(`/recipes/${req.params.id}`)

  let recipe

  recipeDocRef
    .get()
    .then(doc => {
      if (doc.exists) {
        recipe = { id: doc.id, ...doc.data() }

        if (recipe.userHandle === req.user.handle) {
          return res
            .status(400)
            .json({ error: "You can't remove bookmark from your own recipe" })
        } else {
          return bookmarkDocRef.get()
        }
      } else {
        return res.status(404).json({ error: 'Recipe not found' })
      }
    })
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        return db
          .doc(`/bookmarks/${querySnapshot.docs[0].id}`)
          .delete()
          .then(() => {
            recipe.bookmarkCount--
            return recipeDocRef.update({ bookmarkCount: recipe.bookmarkCount })
          })
          .then(() => res.status(200).json(recipe))
      } else {
        return res.status(400).json({ error: 'Recipe not bookmarked' })
      }
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getTags = (req, res) => {
  const tags = []

  db.collection('tags')
    .orderBy('value', 'desc')
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        tags.push({ id: doc.id, ...doc.data() })
      })
      return res.status(200).json(tags)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.uploadPicture = (req, res) => {
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

    const imgExt = mimetype.split('/').pop()
    imgFilename = `${uuid()}.${imgExt}`

    const dirPath = `users/${req.user.uid}/recipes/${imgFilename}`
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
        const recipePicture = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/users%2F${req.user.uid}%2Frecipes%2F${imgFilename}?alt=media`
        return recipePicture
      })
      .then(recipePicture =>
        res.json({ name: imgFilename, url: recipePicture })
      )
      .catch(err => res.status(500).json({ error: err }))
  })

  busboy.end(req.rawBody)
}

exports.deletePicture = (req, res) => {
  const bucket = admin.storage().bucket(config.storageBucket)
  const file = bucket.file(
    `users/${req.user.uid}/recipes/${req.params.imageName}`
  )

  file
    .delete()
    .then(data => {
      return res.status(200).json(data)
    })
    .catch(err => res.status(500).json({ error: err }))
}
