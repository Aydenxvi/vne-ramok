// Demo inventory. Replace these records and illustration assets before selling.
window.CATEGORIES = [
 {id:'all',name:'Все вещи',icon:'star'}, {id:'jeans',name:'Джинсы',icon:'jeans'},
 {id:'pants',name:'Штаны',icon:'jeans'}, {id:'hoodies',name:'Худи и кофты',icon:'hoodie'},
 {id:'jackets',name:'Куртки',icon:'jacket'}, {id:'tees',name:'Футболки',icon:'tee'}, {id:'hats',name:'Шапки',icon:'hat'}
];
// `colors` lists demo color variants per product (first entry = the color shown in the
// photo/sketch; the rest are sample swatches only — see the product dialog's disclaimer).
window.PRODUCTS = [
 {id:'denim01',name:'BAGGY DENIM 01',category:'jeans',price:7990,sizes:['28','30','32','34'],color:'Индиго',colors:[{name:'Индиго',hex:'#3b4f78'},{name:'Чёрный',hex:'#23241f'},{name:'Светлый индиго',hex:'#6c86ab'}],photo:0,new:true,desc:'Объёмная посадка, широкая штанина и плотный деним. Демонстрационная модель.'},
 {id:'denim02',name:'WASHED DENIM 02',category:'jeans',price:8490,sizes:['28','30','32','34','36'],color:'Графит',colors:[{name:'Графит',hex:'#54544c'},{name:'Тёмно-синий',hex:'#2b3346'},{name:'Чёрный',hex:'#1d1e1b'}],photo:1,new:true,desc:'Свободный силуэт и винтажная стирка. Демонстрационная модель.'},
 {id:'hoodie01',name:'HEAVY ZIP HOODIE',category:'hoodies',price:6990,sizes:['S','M','L','XL'],color:'Угольный',colors:[{name:'Угольный',hex:'#282b29'},{name:'Молочный',hex:'#c9c6b8'},{name:'Оливковый',hex:'#616851'}],icon:'hoodie',new:true,desc:'Объёмный капюшон, спущенное плечо и металлическая молния. Эскиз будущей вещи.'},
 {id:'jacket01',name:'CITY BOMBER',category:'jackets',price:11990,sizes:['M','L','XL'],color:'Оливковый',colors:[{name:'Оливковый',hex:'#616851'},{name:'Угольный',hex:'#282b29'},{name:'Песочный',hex:'#92856f'}],icon:'jacket',new:true,desc:'Короткий объёмный бомбер. Эскиз будущей вещи.'},
 {id:'tee01',name:'BOXY TEE',category:'tees',price:3490,sizes:['S','M','L','XL'],color:'Молочный',colors:[{name:'Молочный',hex:'#c2bfae'},{name:'Угольный',hex:'#282b29'}],icon:'tee',new:false,desc:'Свободная футболка с плотной горловиной. Эскиз будущей вещи.'},
 {id:'hat01',name:'RIB BEANIE',category:'hats',price:1990,sizes:['ONE SIZE'],color:'Чёрный',colors:[{name:'Чёрный',hex:'#1d1e1b'},{name:'Угольный',hex:'#282b29'},{name:'Оливковый',hex:'#616851'}],icon:'hat',new:true,desc:'Шапка в рубчик с широким отворотом. Эскиз будущей вещи.'},
 {id:'pants01',name:'WIDE CARGO',category:'pants',price:7490,sizes:['S','M','L','XL'],color:'Песочный',colors:[{name:'Песочный',hex:'#92856f'},{name:'Угольный',hex:'#282b29'}],icon:'jeans',new:false,desc:'Широкие брюки с карманами. Эскиз будущей вещи.'},
 {id:'tee02',name:'DAILY TEE / BLACK',category:'tees',price:2990,sizes:['S','M','L'],color:'Чёрный',colors:[{name:'Чёрный',hex:'#1d1e1b'},{name:'Молочный',hex:'#c2bfae'}],icon:'tee',new:false,desc:'Базовая футболка свободного кроя. Эскиз будущей вещи.'}
];
