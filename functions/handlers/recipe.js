const { db } = require('../utils/admin')

const { commentValidator } = require('../utils/validators')

exports.getInitialRecipe = (req, res) => {
  db.collection('recipes')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()
    .then(querySnapshot => {
      const recipes = []
      querySnapshot.forEach(doc => {
        recipes.push({ id: doc.id, ...doc.data() })
      })

      return res.json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

exports.getRecipeRange = (req, res) => {
  const recipes = []
  const lastRecipeDate = req.params.createdAt

  db.collection('recipes')
    .where('createdAt', '<', lastRecipeDate)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        recipes.push({ id: doc.id, ...doc.data() })
      })
      return res.status(200).json(recipes)
    })
    .catch(err => res.status(500).json({ error: err }))
}

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

exports.createRecipe = (req, res) => {
  const newRecipe = {
    userHandle: req.user.handle,
    body: req.body.body,
    imgUrl: req.user.imgUrl,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    createdAt: new Date().toISOString()
  }

  db.collection('recipes')
    .add(newRecipe)
    .then(doc => res.status(201).json({ id: doc.id, ...newRecipe }))
    .catch(err => res.status(500).json({ error: err.code }))
}

exports.deleteRecipe = (req, res) => {
  const recipe = db.doc(`/recipes/${req.params.id}`)
  const batch = db.batch()

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
    .then(() => {
      return db.collection('likes').where('recipeId', '==', req.params.id).get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        batch.delete(db.doc(`/likes/${doc.id}`))
      })
      return db
        .collection('comments')
        .where('recipeId', '==', req.params.id)
        .get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        batch.delete(db.doc(`/comments/${doc.id}`))
      })
      return db
        .collection('bookmarks')
        .where('recipeId', '==', req.params.id)
        .get()
    })
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        batch.delete(db.doc(`/bookmarks/${doc.id}`))
      })
    })
    .then(() => batch.commit())
    .then(() =>
      res.status(200).json({ message: 'Recipe deleted successfully' })
    )
    .catch(err => res.status(500).json({ error: err.code }))
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
    userImg: req.user.imgUrl,
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
    .catch(err => res.status(500).json({ error: err.code }))
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

        if (recipe.user_handle === req.user.handle) {
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

        if (recipe.user_handle === req.user.handle) {
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
    .catch(err => res.status(500).json({ error: err.code }))
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

        if (recipe.user_handle === req.user.handle) {
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
    .catch(err => res.status(500).json({ error: err.code }))
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

        if (recipe.user_handle === req.user.handle) {
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
    .catch(err => res.status(500).json({ error: err.code }))
}
