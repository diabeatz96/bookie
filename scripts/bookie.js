// Extracting users and ratings from more than 50 users

// document.querySelector("#ratings").onclick = function()
// {
// let x = ratings['user_id'].value_counts() > 50;
// let y = x[x].index; //Number of user ID's
// print(y.shape);
// ratings = ratings[ratings['user_id'].isin(y)];
// }

// var http = require('http');
// var hostname = 'localhost';
// var port = 2022;

// var server = http.createServer(function (req, res) {
//     res.writeHead(200, {'Content-Type': 'text/html'});
//     res.end('Welcome to Bookie!');
//   });

// server.listen (port, hostname (){
//     console.log('server running at ${hostname}:${port}')
// });

function euclideanDistance (user1, user2) {
  const n = _.size(user1.reviews)
  let coefficient = 0

  if (n === 0) {
    return n
  }

  for (let i = 0; i < n; i++) {
    coefficient += Math.pow(user1.reviews[i].rating - user2.reviews[i].rating, 2)
  }

  return 1 / (1 + Math.sqrt(coefficient))
}

function squaredNum (review) {
  return Math.pow(review.rating, 2)
}

// correlation coefficient
function pcc (user1, user2) {
  const n = _.size(user1.reviews)

  if (n === 0) {
    return n
  }

  const user1BookScoreSum = _.sumBy(user1.reviews, 'rating')
  const user2BookScoreSum = _.sumBy(user2.reviews, 'rating')
  const user1BookScoreSqSum = _.sumBy(user1.reviews, squaredNum)
  const user2BookScoreSqSum = _.sumBy(user2.reviews, squaredNum)
  let pSum = 0

  for (let i = 0; i < n; i++) {
    pSum += (user1.reviews[i].rating * user2.reviews[i].rating)
  }

  const num = pSum - ((user1BookScoreSum * user2BookScoreSum) / n)
  const den = Math.sqrt(
  (user1BookScoreSqSum - (Math.pow(user1BookScoreSum, 2) / n)) *
    (user2BookScoreSqSum - (Math.pow(user2BookScoreSum, 2) / n))
  )

  if (den === 0) {
    return 0
  }

  return num / den
}


// Similar calculation

async function updateUserSimilarityScores (username) {
  const users = await db.user.getVals()
  const mainUser = await db.user.get(username)

  mainUser.reviews = await getUserBookReviews(mainUser)
  const mainUserBook = _.map(mainUser.reviews, 'bookId')

  return Promise.map(users, async function (user) {
    user.reviews = await getUserMutualBookReviews(user, mainUserBook)

    if (user.username === mainUser.username) {
      return
    }

    const clonedUsers = filterUserMutualBook(mainUser, user)

    return db.similarity.put([user.username, mainUser.username].sort().join('-'), {
      euclideanDistance: algorithms.euclideanDistance(clonedUsers[0], clonedUsers[1]),
      manhattanDistance: algorithms.manhattanDistance(clonedUsers[0], clonedUsers[1]),
      pcc: algorithms.pcc(clonedUsers[0], clonedUsers[1]),
      users: [user.username, mainUser.username].sort(),
    })
  })
}

//Similarity between users

router.get('/user', auth, async function (req, res) {
  const {username} = req
  const similarity = helper.sortByAlgorithm(await db.similarity.getBy(function (user) {
    return _.includes(user.users, username)
  }), 'pcc')

  const usersSimilarities = await Promise.map(similarity, async function (similarityData) {
    return {
      ...similarityData,
      user: await db.user.get(_.remove(similarityData.users, function (user) {
        return user !== username
      })[0]),
    }
  })

  res.render('users', {usersSimilarities})
})

// Actual recommendation

router.get('/book', auth, async function (req, res) {
  const {username} = req
  const similarityData = _(await db.similarity.getBy(function (similarity) {
    return _.includes(similarity.users, username)
  })).orderBy('pcc', 'desc').take(5).value()
  const users = _(similarityData).map(function (similarity) {
    return {
      ..._.omit(similarity, 'users'),
      username: _.remove(similarity.users, function (user) {
        return user !== username
      })[0],
    }
  }).value()

  const mainUser = await db.user.get(username)
  mainUser.reviewedBook = _.map(await helper.getUserBookReviews({username}), 'bookId')

  await Promise.map(users, async function (user) {
    user.reviews = _(await db.review.getBy(function (review) {
      return review.username === user.username && !_.includes(mainUser.reviewedBook, review.bookId)
    })).orderBy('rating', 'desc').take(5).value()
  })

  let bookRecommendations = []

  _.forEach(users, function (user) {
    _.forEach(user.reviews, function (review) {
      bookRecommendations.push({
        bookId: review.bookId,
        rating: review.rating * user.pcc,
      })
    })
  })

  bookRecommendations = _(bookRecommendations)
  .orderBy('rating', 'desc')
  .unionBy('bookId')
  .value()

  let book = await Promise.map(bookRecommendations, function (bookRecommendation) {
    return db.book.get(bookRecommendation.bookId)
  })

  if (!_.size(book)) {
    book = await db.book.getVals()
  }

  return res.render('book', {book})
})