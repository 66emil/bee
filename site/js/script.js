document.addEventListener('DOMContentLoaded', function () {
	
	// Fancybox
	Fancybox.defaults.autoFocus = false
	Fancybox.defaults.trapFocus = false
	Fancybox.defaults.dragToClose = false
	Fancybox.defaults.placeFocusBack = false
	Fancybox.defaults.l10n = {
		CLOSE: "Закрыть",
		NEXT: "Следующий",
		PREV: "Предыдущий",
		MODAL: "Вы можете закрыть это модальное окно нажав клавишу ESC"
	}
	
	Fancybox.defaults.template = {
		closeButton: '',
		spinner: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="25 25 50 50" tabindex="-1"><circle cx="50" cy="50" r="20"/></svg>',
		main: null
	}
	
	
	// Всплывающие окна
	const modalBtns = document.querySelectorAll('.modal_btn')
	
	if (modalBtns) {
		modalBtns.forEach(el => {
			el.addEventListener('click', e => {
				e.preventDefault()
				
				Fancybox.close()
				
				Fancybox.show([{
					src: document.getElementById(el.getAttribute('data-modal')),
					type: 'inline'
				}])
			})
		})
	}
	
	$('.modal .close').click(function(e) {
		e.preventDefault()
		
		Fancybox.close()
	})
	
	
	// Увеличение картинки
	Fancybox.bind('.fancy_img', {
		Image: {
			zoom: false,
		},
		Thumbs: {
			autoStart: false,
		}
	})
	//меню
	var button = document.getElementById('burger'); 
	button.onclick = function() {
		var div = document.getElementById('mobMenu');
		if (div.style.display !== 'none') {
			div.style.display = 'none';
		}
		else {
			div.style.display = 'block';
		}
	};
	
	//поиск
	
	var search = document.getElementById('a-search'); 
	search.onclick = function() {
		var divs = document.getElementById('search');
		if (divs.style.display !== 'none') {
			divs.style.display = 'none';
		}
		else {
			divs.style.display = 'block';
		}
	};
	var search1 = document.getElementById('a-search1'); 
	search1.onclick = function() {
		var divs1 = document.getElementById('search');
		if (divs1.style.display !== 'none') {
			divs1.style.display = 'none';
		}
		else {
			divs1.style.display = 'block';
		}
	};
	
	// Плавная прокрутка к якорю
	const scrollBtns = document.querySelectorAll('.scroll_btn')
	
	if (scrollBtns) {
		scrollBtns.forEach(element => {
			element.addEventListener('click', e => {
				e.preventDefault()
				
				let anchor = element.getAttribute('data-anchor')
				
				document.getElementById(anchor).scrollIntoView({
					behavior: 'smooth', 
					block: 'start'
				}, 1000)
			})
		})
	}
	
	var ajax = {
		post: function(form_wrapper_id,form_id,query_key,success_callback){
			//обёртка формы, айди формы, ключ запроса, код на успех
			$.ajax({
				type: 'post',
				url: '/ajax.php?q=' + query_key,
				data: $(form_id).serialize(),
				success:success_callback
			});
		}
		
	};
	
	$('.feedback_new').on('click', function () {
		
		$('#step1_fdb').show();
		$('#step2_fdb').hide();
	});
	
	$(document).ready(function(){
		
		$(document).on('submit', '#cta_form',function(e){
			ajax.post(
				'#step1_fdb',
				'#cta_form',
				'cta',
				function(data){					
					if ($.trim(data) == 'ok') {
						$('#step1_fdb').hide();
						$('#step2_fdb').show();
					} else $("#step1_fdb").html(data);
				}
			);
			e.preventDefault();
		});
		$(document).on('submit', '#fb_form',function(e){
			ajax.post(
				'#form_feedback',
				'#fb_form',
				'fb',
				function(data){					
					if ($.trim(data) == 'ok') {
						$('#form_feedback').hide();
						$('#thanks_contact').show();
					} else $("#form_feedback").html(data);
				}
			);
			e.preventDefault();
		});
	});
	
	$('.animate').on('click', function(){
		$("#item_tobasket").removeClass('hidden');
		var that = $(this);
		var bascket = $("#top_basket");
		var w = that.width();		
		that.clone()
		.css({'width' : w,
			'position' : 'absolute',
			'z-index' : '9999',
			'pointerEvents' : 'none',
			top: that.offset().top,
		left:that.offset().left})
		.appendTo("body")
		
		.animate({
			opacity: 0.05,
			duration:700,
			left: bascket.offset()['left'],
			top: bascket.offset()['top']
			}, 1500, function() {	
			$(this).remove();
		});
	});
	$(".noweight .buy-btns .buy .name > span").remove();
	
	$('.delivery').on('change', function() {
		if ($('#deliv1').is(':checked')) {
			$('#pay_block').show();
			$('#pay1').parent().show();
			$('#pay2').parent().show();
			$('#pay3').parent().show();
			$('#addr').show();
		} 
		if ($('#deliv2').is(':checked')) {
			$('#pay_block').show();
			$('#pay1').parent().show();
			$('#pay2').parent().show();
			$('#pay3').parent().hide();
			$('#addr').show();
			$("#pay3").prop('checked', false);
		} 
		if ($('#deliv3').is(':checked')) {
			$('#pay_block').hide();
			$('#addr').hide();
			$("#pay1").prop('checked', false);
			$("#pay2").prop('checked', false);
			$("#pay3").prop('checked', false);
		} 
	}).trigger('change');
})

