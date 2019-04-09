// This is in the Frontend Uploader file: 'frontend-uploader.php' Line: 283
// Add the user's id + day, hour, year to the front of the image
// Format is: 'user_USERID_DAYOFMONTH_HOUROFDAY_YEAR_FILENAME'
	$tmp_current_user = wp_get_current_user();
$my_tmp_date=current_time('d_G_Y');
$k['name'] = 'user_'.$tmp_current_user->id.'_'.$my_tmp_date.'_'.$k['name'];