import pandas as pd
import random
import datetime

kw_list = [
    'Smartphone','Laptop','Sneakers','T-Shirts','Rice','Flour','Smartwatch','Jeans','Basmati Rice','Tablet',
    'Dress','Bread','Bluetooth Speaker','Jacket','Dal','Headphones','Kurta','Sugar'
]
sources = ['pytrends','twitter','instagram']
categories = {
    'Smartphone':'Electronics','Laptop':'Electronics','Smartwatch':'Electronics','Tablet':'Electronics',
    'Bluetooth Speaker':'Electronics','Headphones':'Electronics','Sneakers':'Fashion','T-Shirts':'Fashion',
    'Jeans':'Fashion','Dress':'Fashion','Jacket':'Fashion','Kurta':'Fashion','Rice':'Grocery','Flour':'Grocery',
    'Basmati Rice':'Grocery','Bread':'Grocery','Dal':'Grocery','Sugar':'Grocery','Wheat Flour':'Grocery'
}

rows = []
for i in range(100):
    kw = random.choice(kw_list)
    score = random.randint(50, 100)
    source = random.choice(sources)
    cat = categories.get(kw, 'Other')
    date = (datetime.datetime.now() - datetime.timedelta(days=random.randint(0,90))).strftime('%Y-%m-%d')
    rows.append({'product':kw,'category':cat,'score':score,'source':source,'date':date})
pd.DataFrame(rows).to_csv('backend/data/social_trends.csv', index=False)
print('Filled backend/data/social_trends.csv with 100 rows of random data.') 