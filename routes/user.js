var express = require('express');
const userHelper = require('../helpers/user-helper');
var router = express.Router();
var productHelper = require('../helpers/product-helper');
const { response } = require('../app');
const paypal = require('paypal-rest-sdk');
const collections = require('../config/collections');
var db = require('../config/connection')
var collection = require('../config/collections')
const { compareSync } = require('bcrypt');
const session = require('express-session');
var objectId = require('mongodb').ObjectId
const client = require("twilio")(
  process.env.TWILO_API_KEY1,
  process.env.TWILO_API_KEY2
);

console.log( process.env.TWILO_API_KEY1, process.env.TWILO_API_KEY2)

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.PAYPAL_CLINT_ID,
  'client_secret': process.env.PAYPAL_CLINT_SECRET
});

// const verifyLogin  = async (req,res,next)=>{
//   if(req.session.userLoggedIn){
//     req.session.cartCount  =  await userHelper.getCartCounter(req.session.userId)

//   }


const verifyLogin = async (req, res, next) => {
  if (req.session.userLoggedIn) {
    req.session.cartCount = await userHelper.getCartCounter(req.session.userId)
    cartCounter = req.session.cartCount
    req.session.wishlistCouner = await userHelper.getWishListCounter(req.session.userId)
    wishlistCouner = req.session.wishlistCouner
    next()
  } else {
    res.redirect('/')
  }
}




/* GET home page. */
router.get('/', async function (req, res) {
  let value = req.session.userLoggedIn
  const cartCounter = await userHelper.getCartCounter(req.session.userId)
  userHelper.getWishListCounter(req.session.userId).then((wishlistCouner) => {
    userHelper.trendingProducts().then((trending) => {
      productHelper.getAllProducts().then((products) => {
        productHelper.getCategory().then((category) => {
          userHelper.getSlider().then((slider) => {
            userHelper.getServices().then((service) => {
              userHelper.getBanner3().then((banner3) => {
                productHelper.getDiscountedProducts().then((products) => {
                  res.render('user/index', { products, category, value, trending, user: true, wishlistCouner, cartCounter, slider, service, banner3 })
                })
              })
            })
          })
        })
      })
    })
  })
})

router.get('/signup', (req, res) => {
  if (req.session.newerror) {
    delete req.session.newerror
    res.render('user/signup', { error: ' password not matching' })
  } else {
    res.render('user/signup')
  }

})

router.post('/signup', (req, res) => {

  req.body.blockStatus = false


  if (req.body.psw == req.body.repsw) {
    userHelper.signUp(req.body).then(async (response) => {
      if (response.message) {
        res.render('user/signup', { message: 'accoount already exist please Login' })
      } else {
        if (req.session.referal) {
          req.session.user = response.user
          await userHelper.referalChecker(req.session.referal, req.session.user)
          console.log([{ user: objectId(req.session.referal), amount: 100 }, { user: req.session.user, amount: 50 }])
          for (const i of [{ user: objectId(req.session.referal), amount: 100 }, { user: req.session.user, amount: 50 }]) {
            userHelper.addReferalAmount(i.user, i.amount).then((response) => {
              console.log("wallet adeds");
            })

          }
        }

        res.redirect('/login')

      }
    })
  } else {
    req.session.newerror = true
    res.redirect('/signup')
  }
})
router.get('/login', (req, res) => {
  res.render('user/login')
})

let message
router.post('/login', (req, res) => {
  userHelper.login(req.body).then((result) => {
    if (result.user) {
      message = 'your blocked by admin'
      res.render('user/login', { message })
    } else if (result.psw) {
      message = 'Incorrect password'
      res.render('user/login', { message })
    } else if (result.email) {
      message = 'Incorrect email'
      res.render('user/login', { message })
    } else {
      req.session.phone = result.phone
      req.session.user = true
      req.session.userId = result.id
      req.session.userLoggedIn = true
      res.redirect('/')
    }
  })
})

router.get('/temp', (req, res) => {
  res.render('user/temp')
})
router.get('/product/:id', verifyLogin, (req, res) => {
  userHelper.getCartCounter(req.session.userId).then((cartCounter) => {
    let proId = req.params.id
    userHelper.getprodetails(proId).then((details) => {
      res.render('user/product-details', { details, user: true, cartCounter })
    })
  })
})

router.get("/sendcode", (req, res) => {
  client.verify
    .services('VA99ee67ecdb589f8383486c5fbaaacb45') // Change service ID
    .verifications.create({
      to: `+91${req.query.phonenumber}`,
      channel: req.query.channel === "call" ? "call" : "sms",
    })
    .then((data) => {
      let phone = req.query.phonenumber
      let message = String(phone).slice(-2)
      let error = req.session.logginError
      res.render('user/verify', { phone, message,error })

    }).catch((error) => {
      console.log(error )
    })
});

let loggedIn = false

router.get("/verify", (req, res) => {
  client.verify
    .services('VA99ee67ecdb589f8383486c5fbaaacb45') // Change service ID
    .verificationChecks.create({
      to: `+91${req.query.phonenumber}`,
      code: req.query.code,
    })
    .then((data) => {
      if (data.status === "approved") {
        console.log('here');
        req.session.logginError = false
        req.session.user = true
        console.log('here1');
        res.redirect('/')
      } else {
        console.log('Invalid OTP');
       req.session.logginError = true
       res.redirect('/verify')
      }
    });
});
router.get('/logout', (req, res) => {
  req.session.user = false
  req.session.userLoggedIn = false
  delete req.session.userId;
  res.redirect('/')
})




router.get('/cart', (req, res) => {
  userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
    userHelper.getCartProducts(req.session.userId).then((products) => {
      userHelper.getTotal(req.session.userId).then((total) => {
        userHelper.discount(req.session.userId).then((discount) => {
          if (req.session.user && products.length !== 0) {
            res.render('user/cartt', { discount, products, user: true, userI: req.session.userId, total, totalAfterDiscount })
          } else if (req.session.user) {
            res.render('user/cart', { user: true })
          } else {
            console.log('no session..........................................................................');
            res.redirect('/login')
          }
        })
      })
    })
  })
})

router.get('/add-to-cart/:id', (req, res) => {
  if (req.session.userId) {
    userHelper.addToCart(req.params.id, req.session.userId).then((response) => {
      res.json(response)
    })
  }

})

router.post('/change-quantity', (req, res) => {
  userHelper.changeQuantity(req.body).then((response) => {
    userHelper.getTotal(req.body.user).then((data) => {
      userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
        response.total = totalAfterDiscount
        console.log(response, 'wefwfwfwef');
        res.json(response)
      })
    })
  })
})

router.get('/user-detailes', verifyLogin, (req, res) => {
  userHelper.getUserphone(req.session.userId).then((user) => {
    userHelper.getUserAddress(req.session.userId).then((userObj) => {
      userHelper.getuserDetails(req.session.userId).then(async(userData) => {
        const perPage = 10
        const totalcount = await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(req.session.userId)}).count()
        const pagination = totalcount / perPage + 1
        const currentPage = (req.query.page == null) ? 1 : req.query.page;
        userHelper.getOrders(req.session.userId,currentPage).then((orders) => {
          orders = orders.map((i) => {
            const [day, month, date, year] = i.date.toString().split(' ')
            i.date = day + ' ' + month + ' ' + date + ' ' + year
            return i
          })
          res.render('user/user-detailes', { user, userObj, userData, cartCounter, wishlistCouner,pagination, orders, user: req.session.userId })
        })
      })

    })
  })
})

router.post('/cart/remove-pro', (req, res) => {
  userHelper.removeproduct(req.body).then((response) => {
    res.send(response)
  })
})

router.post('/wish/remove-pro', (req, res) => {
  console.log(req.body)
  userHelper.whishRemove(req.body).then((response) => {
    res.send(response)
  })
})

router.get('/cart/check-out', verifyLogin, ((req, res) => {
  if (req.session.userId) {
    userHelper.getCartProducts(req.session.userId).then((products) => {
      userHelper.getTotalCheckout(req.session.userId).then((total) => {
        userHelper.getUserAddress(req.session.userId).then((userObj) => {
          userHelper.getTotal(req.session.userId).then((totalamount) => {
            userHelper.discount(req.session.userId).then((discount) => {
              userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
                userHelper.totalAfterD(req.session.userId).then((totalD) => {
                  res.render('user/check-out', { totalD, userObj, totalAfterDiscount, cartCounter, wishlistCouner, discount, totalamount, products, user: req.session.userId })
                })
              })
            })
          })
        })
      })
    })
  } else {
    res.redirect('/login')
  }

}))

router.post('/cart/check-out', verifyLogin, (req, res) => {
  if (req.session.userId) {
    userHelper.getCartProductList(req.session.userId).then((products) => {
      userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
        userHelper.getTotal(req.session.userId).then((total) => {
          console.log('req.body', req.body)
          userHelper.placeOrder(req.body, products, total, req.session.userId).then((response) => {

            if (req.body.paymentMethod === 'COD') {
              res.json({ codSuccess: true })
            } else if (req.body.paymentMethod === 'ONLINE') {
              userHelper.generateRazorpay(response.insertedId, totalAfterDiscount).then((response) => {
                res.json({ razor: response })
              })
            } else if (req.body.paymentMethod === 'paypal') {
              userHelper.paypal(totalAfterDiscount).then((response) => {
                res.json(response)
              })
            }
          })
        })
      })
    })
  }

})




router.get('/success', verifyLogin, (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": "25.00"
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log(JSON.stringify(payment));
      res.redirect('/order-status')
    }
  });
});


router.post('/user-detailes', verifyLogin, (req, res) => {
  if (req.session.userId) {
    userHelper.addAddress(req.body,).then((address) => {
      res.send('hi')
    })
  } else {
    res.redirect('/')
  }

})

router.get('/order-status', verifyLogin, (req, res) => {
  res.render('user/order-status', { cartCounter, wishlistCouner, })
})


router.get('/orderd-products/:id', verifyLogin, (req, res) => {
  let proId = req.params.id
  if (req.session.userId) {
    userHelper.getOrderProducts(proId).then((products) => {

      res.render('user/orderd-productsList', { products, user: true, cartCounter, wishlistCouner, })
    })
  } else {
    res.redirect('/login')
  }
})

router.post('/cancel-pro', verifyLogin, (req, res) => {
  userHelper.cancelOrder(req.body).then((result) => {
    res.send('hi')
  })
})

router.post('/deleteAdd', verifyLogin, (req, res) => {
  userHelper.deleteAdd(req.body).then((response) => {
    res.send('hoi')
  })
})



router.get('/add-to-whish/:id', (req, res) => {
  console.log('hiiiiiiiiiiiii')
  let prodId = req.params.id
  if (req.session.userId) {
    userHelper.addToWhish(prodId, req.session.userId).then((response) => {
      console.log('hiiiiiiiiiiiiiqqqqq')
      res.send('hi')
    })
  }
})

router.get('/whishList', verifyLogin, (req, res) => {
  if (req.session.userId) {
    userHelper.getWishList(req.session.userId).then((products) => {
      if (req.session.userId && products.length !== 0) {
        res.render('user/whishList', { user: true, products, cartCounter, wishlistCouner, })
      } else if (req.session.userId) {
        res.render('user/emptyWish')
      }
    })
  }

})


router.post('/verify-payment', verifyLogin, (req, res) => {
  console.log('req.body');
  console.log(req.body);
  console.log('req.body');
  userHelper.verifyPayment(req.body).then(() => {
    userHelper.changePaymentStatus(req.body.order.receipt).then(() => {
      res.json({ status: true })
    })
    userHelper.paymentStatus(req.body.order.receipt).then(() => {

    })
  }).catch((error) => {
    res.json({ status: false })
  })
})

router.post('/add-checkoutAddress', verifyLogin, (req, res) => {
  userHelper.addAddress(req.body,).then((address) => {
    res.send('hi')
  })
})


router.post('/applyCoupon', verifyLogin, (req, res) => {
  userHelper.getTotal(req.body.userId).then((total) => {
    userHelper.applyCoupon(req.body, total).then((response) => {
      let message
      if (response.alreadyUsed) {
        message = 'Coupon is already used'
        res.json({ total: response.totalAfterCoupon, message })
      } else if (response.applied) {
        message = "Coupon Applied"
        res.json({ total: response.totalAfterCoupon, message })
      } else if (response.expiry) {
        message = 'Coupon Expired'
        res.json({ total: response.totalAfterCoupon, message })
      } else {
        message = 'Invalid Coupon'
        res.json({ total: response.totalAfterCoupon, message })
      }

    })
  })
})

router.post('/return-pro', verifyLogin, (req, res) => {
  userHelper.changeStatus(req.body.orderId).then((response) => {
    res.send(true)
  })
})

router.get('/product-list/:id', verifyLogin, async (req, res) => {
  categoryId = req.params.id
  const perPage = 8
  // const totalcount = await db.get().collection(collection.ORDER_COLLECTION).find().count()
  const pagination = 12 / perPage + 1
  const currentPage = (req.query.page == null) ? 1 : req.query.page;
  userHelper.categoryList(categoryId, currentPage).then((products) => {
    const category = products[0].categoryName
    res.render('user/productList', { products, user: true, category, pagination })
  })
})


router.get('/wallet', verifyLogin, async (req, res) => {
  userHelper.getWallet(req.session.userId).then((walletMoney) => {
    res.render('user/wallet', { user: true, walletMoney, cartCounter, wishlistCouner, })
  })
})
router.route('/signup/:id')
  .get(async (req, res) => {
    try {
      if (req.params.id) {
        console.log(req.params.id)
        if (!await userHelper.checkUser(req.params.id)) {
          res.render('user/404')
          return
        } else {
          req.session.referal = req.params.id
        }

      }

      res.render('user/referal')
    } catch {
      res.render('user/404')
    }
  })

router.get('/move-to-cart/:id', (req, res) => {
  console.log(req.session.userId)
  userHelper.moveToCart(req.params.id, req.session.userId).then((response) => {
    console.log(req.params.id, req.session.userId, '/////////////////////////////////////////////////////////////////////////////////////')
    res.send('hi')
  })
})

router.get('/pswChange', (req, res) => {
  res.render('user/pswChange', { user: true })
})

router.post('/pswChange',(req,res)=>{
  var currentpsw = req.body.currentpsw
  // userHelper.pswMatch(req.session.userId,currentpsw).then((response)=>{
    res.send(response)
  // })


})
module.exports = router;
