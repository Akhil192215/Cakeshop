var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/product-helper')
var userHelper = require('../helpers/user-helper')
var multer = require('multer')
const logout = require("../middleware/logout_check");
const { response } = require('../app');
const sharp = require('sharp');
var fs = require('fs');
const collections = require('../config/collections');
var db = require('../config/connection')
var collection = require('../config/collections')




var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = 'public/uploads'
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '--' + file.originalname)
  }
})
var upload = multer({ storage: storage })
router.post('/add-products', upload.array('image'), (req, res) => {
  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.addProducts(req.body).then((response) => {
    res.redirect('/admin/add-products')
  })
})

const authourise = (req, res, next) =>
  req.session.adminActive ? next() : res.redirect('/admin/login')



var storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = 'public/category-img'
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '--' + file.originalname)
  }
})
var upload1 = multer({ storage: storage1 })



router.post('/add-category', upload1.array('image'), (req, res) => {

  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.addCategory(req.body).then((response) => {
    res.redirect('/admin/add-category')
  })
})


router.get('/view-products',async (req, res) => {
  const perPage = 15
  const totalcount = await db.get().collection(collection.PRODUCT_COLLECTION).find().count()
  const pagination = totalcount / perPage + 1
  const currentPage = (req.query.page == null) ? 1 : req.query.page;
  productHelper.getAllProducts(currentPage).then((products,) => {
    res.render('admin/view-products', { products, admin: true,pagination })
  })
})

router.get('/add-products', (req, res) => {
  if (req.session.adminActive) {
    productHelper.getCategory().then((category) => {
      res.render('admin/add-products', { admin: true, category })
    })
  } else {
    res.redirect('/admin/login')
  }
})


router.post('/add-products', (req, res) => {
  if (req.session.adminActive) {
    productHelper.addProducts(req.body).then((response) => {
    })
  }
})

router.get('/delete-product/:id', (req, res) => {
  let productId = req.params.id
  productHelper.deleteProducts(productId).then((data) => {
  })
  res.redirect('/admin/view-products')
})

router.get('/edit-product/:id', (req, res) => {
  if (req.session.adminActive) {
    let productId = req.params.id
    productHelper.editProducts(productId).then((products) => {
      productHelper.getCategory().then((category) => {
        res.render('admin/edit-products', { admin: true, products, category })
      })
    })
  } else {
    res.redirect('/admin/login')
  }

})

router.post('/edit-product/:id', upload.array('image'), (req, res) => {
  let productId = req.params.id
  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.updateProduct(productId, req.body).then((response) => {
    if (req.files == null) {
      res.redirect('/admin')
    }else{
      res.redirect('/admin/view-products')
    }
  })
})

router.get('/user-management', (req, res) => {
  if (req.session.adminActive) {
    userHelper.getuser().then((users) => {
      res.render('admin/user-management', { users, admin: true })
    })
  } else {
    res.redirect('/admin/login')
  }


})


router.get('/block-user/:id', (req, res) => {
  let userId = req.params.id
  productHelper.blockUser(userId).then((response) => {
    res.redirect('/admin/user-management')
  })
})

router.get('/unblock-user/:id', (req, res) => {
  let userId = req.params.id
  productHelper.unblockUser(userId).then((response) => {

    res.redirect('/admin/user-management')
  })
})

router.get('/add-category', (req, res) => {
  if (req.session.adminActive) {
    res.render('admin/add-category', { admin: true })
  } else {
    res.redirect('/admin/login')
  }

})


router.get('/category-management', (req, res) => {
  if (req.session.adminActive) {
    productHelper.getCategory().then((category) => {
      res.render('admin/category-management', { category, admin: true })
    })
  } else {
    res.redirect('/admin/login')
  }


})


router.get('/delete-category/:id', (req, res) => {
  let categoryId = req.params.id
  productHelper.deleteCategory(categoryId).then((response) => {
    res.redirect('/admin/category-management')
  })

})

router.get('/edit-category/:id', (req, res) => {
  let categoryId = req.params.id
  productHelper.editCategory(categoryId).then((data) => {
    res.render('admin/edit-category', { data })
  })
})

router.post('/edit-category/:id', upload1.array('image'), (req, res) => {
  let Id = req.params.id

  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.updateCategory(Id, req.body).then((result) => {
    res.redirect('/admin/category-management')
  })
})

router.get('/login', logout, (req, res) => {
  if (req.session.adminActive) {
    res.redirect('/admin')
  }
  else {
    if (req.session.error) {
      delete req.session.error
      res.render('admin/login', { error: "error" })
    } else {
      res.render('admin/login')
    }
  }
})

router.post('/login', logout, (req, res) => {
  if (req.session.adminActive) {
    res.redirect("/admin")
  } else {
    productHelper.adminLogin(req.body).then((resolve) => {
      if (resolve) {
        req.session.adminActive = true
        res.redirect('/admin')
      } else {
        req.session.error = true
        res.redirect('/admin/login')
      }
    })
  }
})
router.get('/logout', (req, res) => {
  req.session.adminActive = false
  res.redirect('/admin/login')
})

router.get('/orders', async (req, res) => {
  if (req.session.adminActive) {
    const perPage = 10
    const totalcount = await db.get().collection(collection.ORDER_COLLECTION).find().count()
    const pagination = totalcount / perPage + 1
    const currentPage = (req.query.pagination == null) ? 1 : req.query.pagination;
    productHelper.orders(currentPage).then((orders) => {
      orders = orders.map((i) => {
        const [day, month, date, year] = i.date.toString().split(' ')
        i.date = day + ' ' + month + ' ' + date + ' ' + year
        return i
      })
      res.render('admin/orders', { orders, admin: true, pagination })
    })
  } else {
    res.redirect('/admin/login')
  }

})


router.get('/', (req, res) => {
  if (req.session.adminActive) {
    productHelper.orders().then((orders) => {

      orders = orders.map((i) => {
        const [day, month, date, year] = i.date.toString().split(' ')
        i.date = day + ' ' + month + ' ' + date + ' ' + year
        return i
      })
      productHelper.salesDataDay().then((day) => {
        const todaySale = day[day.length - 1].totaRevenue
        productHelper.salesDataMonth().then((month) => {
          const monthlySale = month[0].totaRevenue
          productHelper.salesDataYear().then((year) => {
            const yearlySale = year[0].totaRevenue
            res.render('admin/home', { orders, todaySale, monthlySale, yearlySale, year, admin: true, day, month })
          })
        })
      })

    })
  } else {
    res.redirect('/admin')
  }
})

router.get('/order-received/:id', (req, res) => {
  let proId = req.params.id
  userHelper.getOrderProducts(proId).then((products) => {
    res.render('admin/order-received', { products })
  })

})

router.post('/change-status', (req, res) => {
  productHelper.updateStatus(req.body).then((response) => {
    res.send('success')
  })

})

router.get('/multer', (req, res) => {
  res.render('admin/multer')
})

router.get('/product-offers', (req, res) => {
  productHelper.getAllProducts().then((products) => {
    res.render('admin/product-offers', { products, admin: true })
  })
})

router.post('/product-offers', (req, res) => {
  productHelper.productOffer(req.body).then((response) => {
    res.json(response)
  })
})



router.get('/view-offers/:id', (req, res) => {
  proId = req.params.id
  productHelper.viewOffer(proId).then((offer) => {
    res.send(offer)
  })
})


router.get('/add-coupon', (req, res) => {
  res.render('admin/add-coupon', { admin: true })
})

router.post('/add-coupon', (req, res) => {
  userHelper.addCoupon(req.body).then((response) => {
    res.send(true)
  })

})


router.get('/coupon-management', (req, res) => {
  userHelper.getCoupon().then((coupon) => {
    res.render('admin/coupon-management', { coupon, admin: true })
  })

})
router.post('/delete-coupon', (req, res) => {
  productHelper.deleteCoupon(req.body.couponId).then((response) => {
    res.send('hi')
  })
})

router.get('/slider', (req, res) => {
  res.render('admin/homeSlider', { admin: true })
})


var storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = 'public/banner-img'
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '--' + file.originalname)
  }
})
var upload1 = multer({ storage: storage1 })

router.post('/slider', upload1.array('image'), (req, res) => {
  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.addSlider(req.body).then((response) => {
    res.redirect('/admin/slider')
  })
})



var storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = 'public/service-img'
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '--' + file.originalname)
  }
})
var upload1 = multer({ storage: storage1 })

router.post('/services', upload1.array('image'), (req, res) => {
  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.addSercices(req.body).then((services) => {
    res.redirect('/admin/slider')
  })
})



var storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = 'public/banner3-img'
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '--' + file.originalname)
  }
})
var upload1 = multer({ storage: storage1 })


router.post('/Banner3', upload1.array('image'), (req, res) => {
  const files = req.files
  const fileName = files.map((file) => {
    return file.filename
  })
  req.body.image = fileName
  productHelper.addBanner3(req.body).then((response) => {
    res.redirect('/admin/slider')
  })
})

router.post('/edit/remove-img', (req, res) => {
  productHelper.removeImg(req.body)
  res.send('hi')
})



module.exports = router;