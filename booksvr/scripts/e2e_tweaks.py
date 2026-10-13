from calibre.utils.config import tweaks

print('title_series_sorting =', repr(tweaks['title_series_sorting']))
print('default_language_for_title_sort =', repr(tweaks['default_language_for_title_sort']))
data = tweaks['per_language_title_sort_articles']
print('eng articles =', sorted(data.get('eng') or []))
print('zho articles =', sorted(data.get('zho') or []))
print('all langs =', sorted(data.keys())[:20])