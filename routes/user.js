/* eslint-disable import/order */
/* eslint-disable no-shadow */
/* eslint-disable max-len */
const express = require('express');
const paypal = require('paypal-rest-sdk');
const userHelper = require('../helpers/user-helper');

const router = express.Router();
const productHelper = require('../helpers/product-helper');
const { response } = require('../app');

const db = require('../config/connection');
const collection = require('../config/collections');
// eslint-disable-next-line import/order
const objectId = require('mongodb').ObjectId;
// const client = require('twilio')(
//   process.env.TWILO_API_KEY1,
//   process.env.TWILO_API_KEY2,
// );

paypal.configure({
  mode: 'sandbox', // sandbox or live
  client_id: process.env.PAYPAL_CLINT_ID,
  client_secret: process.env.PAYPAL_CLINT_SECRET,
});

// const verifyLogin  = async (req,res,next)=>{
//   if(req.session.userLoggedIn){
//     req.session.cartCount  =  await userHelper.getCartCounter(req.session.userId)

//   }

const verifyLogin = async (req, res, next) => {
  if (req.session.userLoggedIn) {
    req.session.cartCount = await userHelper.getCartCounter(req.session.userId);
    // eslint-disable-next-line no-undef
    cartCounter = req.session.cartCount;
    req.session.wishlistCouner = await userHelper.getWishListCounter(req.session.userId);
    // eslint-disable-next-line no-undef
    wishlistCouner = req.session.wishlistCouner;
    next();
  } else {
    res.redirect('/');
  }
};

/* GET home page. */
router.get('/', async (req, res) => {
  const value = req.session.userLoggedIn;
  const cartCounter = await userHelper.getCartCounter(req.session.userId);
  userHelper.getWishListCounter(req.session.userId).then((wishlistCouner) => {
    userHelper.trendingProducts().then((trending) => {
      userHelper.getAllProducts().then(() => {
        productHelper.getCategory().then((category) => {
          userHelper.getSlider().then((slider) => {
            userHelper.getServices().then((service) => {
              userHelper.getBanner3().then((banner3) => {
                productHelper.getDiscountedProducts().then((products) => {
                  res.render('user/index', {
                    products,
                    category,
                    value,
                    trending,
                    user: true,
                    wishlistCouner,
                    cartCounter,
                    slider,
                    service,
                    banner3,
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

router.get('/signup', (req, res) => {
  if (req.session.newerror) {
    delete req.session.newerror;
    res.render('user/signup', { error: ' password not matching' });
  } else {
    res.render('user/signup');
  }
});

router.post('/signup', (req, res) => {
  req.body.blockStatus = false;

  // eslint-disable-next-line eqeqeq
  if (req.body.psw == req.body.repsw) {
    // eslint-disable-next-line no-shadow
    userHelper.signUp(req.body).then(async (response) => {
      if (response.message) {
        res.render('user/signup', { message: 'accoount already exist please Login' });
      } else {
        if (req.session.referal) {
          req.session.user = response.user;
          await userHelper.referalChecker(req.session.referal, req.session.user);
          // eslint-disable-next-line no-restricted-syntax
          for (const i of [{
            user: objectId(req.session.referal),
            amount: 100,
          },
          { user: req.session.user, amount: 50 }]) {
            userHelper.addReferalAmount(i.user, i.amount).then(() => {
            });
          }
        }
        res.redirect('/login');
      }
    });
  } else {
    req.session.newerror = true;
    res.redirect('/signup');
  }
});
router.get('/login', (req, res) => {
  res.render('user/login');
});

let message;
router.post('/login', (req, res) => {
  userHelper.login(req.body).then((result) => {
    if (result.user) {
      message = 'your blocked by admin';
      res.render('user/login', { message });
    } else if (result.psw) {
      message = 'Incorrect password';
      res.render('user/login', { message });
    } else if (result.email) {
      message = 'Incorrect email';
      res.render('user/login', { message });
    } else {
      req.session.phone = result.phone;
      req.session.user = true;
      req.session.userId = result.id;
      req.session.userLoggedIn = true;
      res.redirect('/');
    }
  });
});

router.get('/temp', (req, res) => {
  res.render('user/temp');
});
router.get('/product/:id', verifyLogin, (req, res) => {
  userHelper.getCartCounter(req.session.userId).then((cartCounter) => {
    const proId = req.params.id;
    userHelper.getprodetails(proId).then((details) => {
      res.render('user/product-details', { details, user: true, cartCounter });
    });
  });
});

// router.get('/sendcode', (req, res) => {
//   console.log(req.query.phonenumber);
//   client.verify
//     .services('MG034458076a2f22b2594c1b0a0331ff50') // Change service ID
//     .verifications.create({
//       to: `+91${req.query.phonenumber}`,
//       channel: req.query.channel === 'call' ? 'call' : 'sms',
//     })
//     .then(() => {
//       const phone = req.query.phonenumber;
//       const message = String(phone).slice(-2);
//       const error = req.session.logginError;
//       res.render('user/verify', { phone, message, error });
//     }).catch((error) => {
//       console.log(error);
//     });
// });

// router.get('/verify', (req, res) => {
//   client.verify
//     .services('VA99ee67ecdb589f8383486c5fbaaacb45') // Change service ID
//     .verificationChecks.create({
//       to: `+91${req.query.phonenumber}`,
//       code: req.query.code,
//     })
//     .then((data) => {
//       if (data.status === 'approved') {
//         req.session.logginError = false;
//         req.session.user = true;
//         res.redirect('/');
//       } else {
//         req.session.logginError = true;
//         res.redirect('/verify');
//       }
//     });
// });
router.get('/logout', (req, res) => {
  req.session.user = false;
  req.session.userLoggedIn = false;
  delete req.session.userId;
  res.redirect('/');
});

router.get('/cart', (req, res) => {
  userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
    userHelper.getCartProducts(req.session.userId).then((products) => {
      userHelper.getTotal(req.session.userId).then((total) => {
        userHelper.discount(req.session.userId).then((discount) => {
          if (req.session.user && products.length !== 0) {
            res.render('user/cartt', {
              discount, products, user: true, userI: req.session.userId, total, totalAfterDiscount,
            });
          } else if (req.session.user) {
            res.render('user/cart', { user: true });
          } else {
            res.redirect('/login');
          }
        });
      });
    });
  });
});

router.get('/add-to-cart/:id', (req, res) => {
  if (req.session.userId) {
    userHelper.addToCart(req.params.id, req.session.userId).then(() => {
      res.json({ login: true });
    });
  } else {
    res.json({ login: false });
  }
});

router.post('/change-quantity', (req, res) => {
  userHelper.changeQuantity(req.body).then((response) => {
    userHelper.getTotal(req.body.user).then(() => {
      userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
        response.total = totalAfterDiscount;
        res.json(response);
      });
    });
  });
});

router.get('/user-detailes', verifyLogin, (req, res) => {
  userHelper.getUserphone(req.session.userId).then((user) => {
    userHelper.getUserAddress(req.session.userId).then((userObj) => {
      userHelper.getuserDetails(req.session.userId).then(async (userData) => {
        const perPage = 10;
        const totalcount = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(req.session.userId) }).count();
        const pagination = totalcount / perPage + 1;
        const currentPage = (req.query.page == null) ? 1 : req.query.page;
        userHelper.getOrders(req.session.userId, currentPage).then((orders) => {
          // eslint-disable-next-line no-param-reassign
          orders = orders.map((i) => {
            const [day, month, date, year] = i.date.toString().split(' ');
            // eslint-disable-next-line no-param-reassign
            i.date = `${day} ${month} ${date} ${year}`;
            return i;
          });
          res.render('user/user-detailes', {
            // eslint-disable-next-line no-undef, no-dupe-keys
            user, userObj, userData, cartCounter, wishlistCouner, pagination, orders, user: req.session.userId,
          });
        });
      });
    });
  });
});

router.post('/cart/remove-pro', (req, res) => {
  userHelper.removeproduct(req.body).then((response) => {
    res.send(response);
  });
});

router.post('/wish/remove-pro', (req, res) => {
  userHelper.whishRemove(req.body).then((response) => {
    res.send(response);
  });
});

router.get('/cart/check-out', verifyLogin, ((req, res) => {
  if (req.session.userId) {
    userHelper.getCartProducts(req.session.userId).then((products) => {
      userHelper.getTotalCheckout(req.session.userId).then(() => {
        userHelper.getUserAddress(req.session.userId).then((userObj) => {
          userHelper.getTotal(req.session.userId).then((totalamount) => {
            userHelper.discount(req.session.userId).then((discount) => {
              userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
                userHelper.totalAfterD(req.session.userId).then((totalD) => {
                  res.render('user/check-out', {
                    // eslint-disable-next-line no-undef
                    totalD, userObj, totalAfterDiscount, cartCounter, wishlistCouner, discount, totalamount, products, user: req.session.userId,
                  });
                });
              });
            });
          });
        });
      });
    });
  } else {
    res.redirect('/login');
  }
}));

router.post('/cart/check-out', verifyLogin, (req, res) => {
  if (req.session.userId) {
    userHelper.getCartProductList(req.session.userId).then((products) => {
      userHelper.totalAfterDiscount(req.session.userId).then((totalAfterDiscount) => {
        userHelper.getTotal(req.session.userId).then((total) => {
          userHelper.placeOrder(req.body, products, total, req.session.userId).then((response) => {
            if (req.body.paymentMethod === 'COD') {
              res.json({ codSuccess: true });
            } else if (req.body.paymentMethod === 'ONLINE') {
              userHelper.generateRazorpay(response.insertedId, totalAfterDiscount).then((response) => {
                res.json({ razor: response });
              });
            } else if (req.body.paymentMethod === 'paypal') {
              userHelper.paypal(totalAfterDiscount, response.insertedId, req.session.userId).then((response) => {
                res.json(response);
              });
            } else if (req.body.paymentMethod === 'wallet') {
              userHelper.wallet(totalAfterDiscount, req.session.userId).then(() => {
                res.json({ paymentMethod: 'wallet' });
              });
            }
          });
        });
      });
    });
  }
});

router.get('/success', verifyLogin, (req, res) => {
  const payerId = req.query.PayerID;
  const { paymentId } = req.query;

  // eslint-disable-next-line camelcase
  const execute_payment_json = {
    payer_id: payerId,
    transactions: [{
      amount: {
        currency: 'USD',
        total: '25.00',
      },
    }],
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      throw error;
    } else {
      const orderId = payment.transactions[0].description;
      userHelper.changePaymentStatus(orderId).then(() => {
        res.redirect('/order-status');
      });
    }
  });
});

router.post('/user-detailes', verifyLogin, (req, res) => {
  if (req.session.userId) {
    userHelper.addAddress(req.body).then(() => {
      res.send('hi');
    });
  } else {
    res.redirect('/');
  }
});

router.get('/order-status', verifyLogin, (req, res) => {
  // eslint-disable-next-line no-undef
  res.render('user/order-status', { cartCounter, wishlistCouner });
});

router.get('/orderd-products/:id', verifyLogin, (req, res) => {
  const proId = req.params.id;
  if (req.session.userId) {
    userHelper.getOrderProducts(proId).then((products) => {
      res.render('user/orderd-productsList', {
        // eslint-disable-next-line no-undef
        products, user: true, cartCounter, wishlistCouner,
      });
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/cancel-pro', verifyLogin, (req, res) => {
  userHelper.cancelOrder(req.body).then(() => {
    res.send('hi');
  });
});

router.post('/deleteAdd', verifyLogin, (req, res) => {
  userHelper.deleteAdd(req.body).then(() => {
    res.send('hoi');
  });
});

router.get('/add-to-whish/:id', (req, res) => {
  const prodId = req.params.id;
  if (req.session.userId) {
    userHelper.addToWhish(prodId, req.session.userId).then(() => {
      res.send('hi');
    });
  }
});

router.get('/whishList', verifyLogin, (req, res) => {
  if (req.session.userId) {
    userHelper.getWishList(req.session.userId).then((products) => {
      if (req.session.userId && products.length !== 0) {
        res.render('user/whishList', {
          // eslint-disable-next-line no-undef
          user: true, products, cartCounter, wishlistCouner,
        });
      } else if (req.session.userId) {
        res.render('user/emptyWish');
      }
    });
  }
});

router.post('/verify-payment', verifyLogin, (req, res) => {
  userHelper.verifyPayment(req.body).then(() => {
    userHelper.changePaymentStatus(req.body.order.receipt).then(() => {
      res.json({ status: true });
    });
  }).catch(() => {
    res.json({ status: false });
  });
});

router.post('/add-checkoutAddress', verifyLogin, (req, res) => {
  userHelper.addAddress(req.body).then(() => {
    res.send('hi');
  });
});

router.post('/applyCoupon', verifyLogin, (req, res) => {
  userHelper.getTotal(req.body.userId).then((total) => {
    userHelper.applyCoupon(req.body, total).then((response) => {
      let message;
      if (response.alreadyUsed) {
        message = 'Coupon is already used';
        res.json({ total: response.totalAfterCoupon, message });
      } else if (response.applied) {
        message = 'Coupon Applied';
        res.json({ total: response.totalAfterCoupon, message });
      } else if (response.expiry) {
        message = 'Coupon Expired';
        res.json({ total: response.totalAfterCoupon, message });
      } else {
        message = 'Invalid Coupon';
        res.json({ total: response.totalAfterCoupon, message });
      }
    });
  });
});

router.post('/return-pro', verifyLogin, (req, res) => {
  userHelper.changeStatus(req.body.orderId).then(() => {
    res.send(true);
  });
});

router.get('/product-list/:id', verifyLogin, async (req, res) => {
  // eslint-disable-next-line no-undef
  categoryId = req.params.id;
  const perPage = 8;
  // const totalcount = await db.get().collection(collection.ORDER_COLLECTION).find().count()
  const pagination = 12 / perPage + 1;
  const currentPage = (req.query.page == null) ? 1 : req.query.page;
  // eslint-disable-next-line no-undef
  userHelper.categoryList(categoryId, currentPage).then((products) => {
    const category = products[0].categoryName;
    res.render('user/productList', {
      products, user: true, category, pagination,
    });
  });
});

router.get('/wallet', verifyLogin, async (req, res) => {
  userHelper.getWallet(req.session.userId).then((walletMoney) => {
    res.render('user/wallet', {
      // eslint-disable-next-line no-undef
      user: true, walletMoney, cartCounter, wishlistCouner,
    });
  });
});
router.route('/signup/:id')
  .get(async (req, res) => {
    try {
      if (req.params.id) {
        if (!await userHelper.checkUser(req.params.id)) {
          res.render('user/404');
          return;
        }
        req.session.referal = req.params.id;
      }

      res.render('user/referal');
    } catch {
      res.render('user/404');
    }
  });

router.get('/move-to-cart/:id', (req, res) => {
  userHelper.moveToCart(req.params.id, req.session.userId).then(() => {
    res.send('hi');
  });
});

router.get('/pswChange', (req, res) => {
  res.render('user/pswChange', { user: true });
});

router.post('/pswChange', (req, res) => {
  // userHelper.pswMatch(req.session.userId,currentpsw).then((response)=>{
  res.send(response);
  // })
});
module.exports = router;
