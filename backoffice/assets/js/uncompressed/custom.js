$(document).ready(function(){
	
	if($(".taskProgress")) {
	
		$(".taskProgress").each(function(){
			
			var endValue = parseInt($(this).html());
											
			$(this).progressbar({
				value: endValue
			});
			
			$(this).parent().find(".percent").html(endValue + "%");
			
		});
	
	}
	
});