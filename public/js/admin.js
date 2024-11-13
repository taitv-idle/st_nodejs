const deleteProduct = (btn) => {
   const prodId = btn.parentNode.querySelector('[name="productId"]').value;
   const csrf = btn.parentNode.querySelector('[name="_csrf"]').value;

   const productElement = btn.closest('article');

   // Hiển thị hộp thoại xác nhận
   const confirmation = confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?");
   if (!confirmation) {
      return; // Nếu người dùng không xác nhận, không thực hiện hành động xóa
   }

   fetch('/admin/product/' + prodId, {
      method: 'DELETE',
      headers: {
         'csrf-token': csrf
      }
   })
       .then(result => {
          if (!result.ok) {
             // Nếu server trả về lỗi, ném ra lỗi để xử lý
             throw new Error('Xóa sản phẩm không thành công!');
          }
          return result.json();
       })
       .then(data => {
          console.log(data);
          // Xóa sản phẩm khỏi giao diện
          productElement.parentNode.removeChild(productElement);
          alert("Sản phẩm đã được xóa thành công!");
       })
       .catch(err => {
          console.error("Lỗi khi xóa sản phẩm:", err);
          alert("Có lỗi xảy ra: " + err.message);
       });
};
