
function bind_book_editable(book_id) {
    // There are some options you can configure when initiating
    // the editable feature as well as a callback function that
    // will be called when textarea gets blurred.
    $(".book-edit").editable({
        toggleFontSize : false,
        closeOnEnter : false,
        //event : 'dblclick',
        event : 'click',
        emptyMessage : '<em>Please write something.</em>',
        callback : function( data ) {
            console.log(data);
            var self = data.$el;
            self.removeClass("book-edit-orig");
            self.addClass("book-edit-new");
            field = self.data().meta;
            if( data.content ) {
                console.log(field + " ==> " + data.content);
                $.ajax({
                    url: "/book/"+book_id+"/edit",
                    type: 'POST',
                    data: {field: field, content: data.content },
                    dataType: 'json',
                    success: function(rsp) {
                        if ( rsp.ecode != 0 ) {
                            alert(rsp.msg);
                        } else {
                            $("#id_" + field).html(data.content);
                        }
                    },
                    error: function(data) {
                        alert("error happen!");
                    }
                });
            }
            self.effect('blink');
        }
    });
    $(".meta-link").addClass("hidden");
    $(".book-edit").removeClass("hidden");
    $("#id_edit_tip").removeClass("hidden");
    $(".book-edit").addClass("book-edit-orig");
}

function book_choose_refer(book_id){
    $('#id_update_dialog').modal();
    $.ajax({
        url: "/book/"+book_id+"/refer",
        type: "GET",
        dataType: "html",
        success: function(rsp){
            $("#id_update_dialog_body").html( rsp );
        },
        error: function(){
            $("#id_update_dialog_body").html( "搜索失败" );
        }
    });
}

function update_rating(where, book_id) {
    r = $(where).val();
    $.ajax({
        url: "/book/"+book_id+"/rating",
        type: 'POST',
        data: {rating: r},
        dataType: 'json',
        success: function(rsp) {
            if ( rsp.ecode != 0 ) {
                alert(rsp.msg);
            }
        },
        error: function(data) {
            alert("error happen!");
        }
    });
}

function save_email() {
    $.cookie("push_email", $("#id_push_email").val());
}

function load_email() {
    console.log("load_email");
    var m = $.cookie("push_email");
    if ( m !== undefined ) {
        $("#id_push_email").val(m);
    }
}


