
//AJAX

//cartt////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function changeQuantity(cartId, proId, userId, count) {
  $.ajax({
    type: 'POST',
    url: '/change-quantity',
    data: {
      cart: cartId,
      product: proId,
      count: count,
      user: userId
    },
    success: function (response) {
      console.log(proId)
      const minusbtn = document.getElementById('minus-btn' + proId)
      if (response.values) {
        minusbtn.disabled = false
        let validator = minusbtn.classList.contains('disabler');
        if (validator) {
          minusbtn.classList.remove('disabler');
        }
        let counter = $('#counter' + proId).html()
        console.log(counter)
        counter = parseInt(counter) + 1
        $("#counter" + proId).html(counter)
        let totalAmout = $('#total').html()
        totalAmout = response.total
        $('#total').html(totalAmout)
      } else {
        console.log(response.count, '....................')
        let counter = $('#counter' + proId).html()
        response.values == false && counter == 2 ? minusbtn.disabled = true : minusbtn.disabled = false
        counter = parseInt(counter) - 1
        $("#counter" + proId).html(counter)
        let totalAmout = $('#total').html()
        totalAmout = response.total
        $('#total').html(totalAmout)
      }
    }

  })
}



(function () {
  const btns = document.getElementsByClassName('disabler')
  for (const i of btns) {
    i.disabled = true
  }
})()





//add to cart///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function addTOCart(proId) {
  console.log(proId)
  $.ajax({
    type: 'GET',
    url: '/add-to-cart/' + proId,
    success: (response) => {
      if (response) {
        let counter = $('#item-count').html()
        console.log('counter')
        console.log(counter)
        console.log('counter')
        counter = parseInt(counter) + 1
        $("#item-count").html(counter)
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          iconColor: 'grey',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'colored-toast'
          },
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
          }
        })
        Toast.fire({
          icon: 'success',
          title: 'Added to cart'
        })
      }

    }
  })
}

/////////////////////////////////////////////
function addToWish(proId) {
  $.ajax({
    type: 'GET',
    url: '/add-to-whish/' + proId,
    success: (response) => {
      if (response) {
        let heart = $('#item-whish').html()
        heart = parseInt(heart) + 1
        $('.item-whish').html(heart)
      }

    }
  })
}



//user-details/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// $('#sendcode').submit((e) => {
//   e.preventDefault()
//   $.ajax({
//     url: '/sendcode',
//     type: 'GET',
//     data: $('#sendcode').serialize(),
//     success: function (response) {
//       alert('success')
//     }
//   })
// })



// $('#verify').submit((e) => {
//   e.preventDefault()
//   $.ajax({
//     url: '/verify',
//     type: 'GET',
//     data: $('#verify').serialize(),
//     success: function (response) {
//       alert('success')
//     }
//   })
// })



$('#pswChange').submit((e) => {
  e.preventDefault()
  $.ajax({
    url: '/pswChange',
    type: 'POST',
    data: $('#pswChange').serialize(),
    success: function (response) {
      alert(response)
    }
  })
})

//////////Cart product remove ////////////////////////////

function removePro(cart, product) {
  console.log(cart, product)
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })
  swalWithBootstrapButtons.fire({
    title: 'Are you sure?',
    text: "remove from cart!",
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        type: 'POST',
        url: '/cart/remove-pro',
        data: {
          cartId: cart,
          proId: product
        },
        success: function (response) {
          if (response.last) {
            location.reload()
          } else {
            document.getElementById(product).style.display = 'none'
          }
        }
      })
    } else if (
      /* Read more about handling dismissals below */
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'Cancelled',
        'Your imaginary file is safe :)',
        'error'
      )
    }
  })
}

/////////Wishlist Remover////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function WhishremovePro(cart, product) {
  console.log(cart, product)
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })
  swalWithBootstrapButtons.fire({
    title: 'Are you sure?',
    text: "remove from cart!",
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: true
  }).then((result) => {

    if (result.isConfirmed) {
      $.ajax({
        type: 'POST',
        url: '/wish/remove-pro',
        data: {
          wishId: cart,
          proId: product
        },
        success: function (response) {
          alert(response)
          if (response) {
            document.getElementById(product).style.display = 'none'
          }
        }
      })
    } else if (
      /* Read more about handling dismissals below */
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'Cancelled',
        'Your imaginary file is safe :)',
        'error'
      )
    }
  })
}



function removeImg(productId, productName) {
  console.log(productId, productName)
  $.ajax({
    type: 'POST',
    url: '/admin/edit/remove-img',
    data: {
      proId: productId,
      imgName: productName
    },
    success: function (response) {
      document.getElementById(productName).style.display = 'none'
    }
  })
}



///////MOVE TO CART//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



function moveToCart(proId) {
  console.log(proId)
  $.ajax({
    type: 'GET',
    url: '/move-to-cart/' + proId,
    success: (response) => {
      if (response) {
        let counter = $('#item-count').html()
        console.log('counter')
        console.log(counter)
        console.log('counter')
        counter = parseInt(counter) + 1
        $("#item-count").html(counter)
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          iconColor: 'grey',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          customClass: {
            popup: 'colored-toast'
          },
          didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
          }
        })
        Toast.fire({
          icon: 'success',
          title: 'Moved to cart'
        })
      }
      location.reload()
    }
  })
}

function stockUpdate(value) {
  const stock = document.getElementById(value).value
  if (stock.innerHTML === 'unavilable') {
    document.getElementById(value).style.color = "#ff0000";
  }
}




