const fs = require('fs');
const file = 'd:/SSD/menu-app/frontend/app/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const block1Start = lines.findIndex(l => l.includes("const [activeTab, setActiveTab]"));
const block1End = lines.findIndex(l => l.includes("const filteredDrinks ="));

const block2Start = lines.findIndex(l => l.includes("{/* Categories */}"));
const block2End = lines.findIndex(l => l.includes("{activeTab === 'orders' && (")) - 1;

if (block1Start === -1 || block1End === -1 || block2Start === -1 || block2End === -1) {
  console.log("Failed to find blocks");
  console.log({ block1Start, block1End, block2Start, block2End });
  process.exit(1);
}

const replacement1 = `  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'cart' | 'profile'>('menu')
  const [viewCategory, setViewCategory] = useState<string>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)

  const [menuItemsList, setMenuItemsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [chefsSelectionList, setChefsSelectionList] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/data');
        const data = await res.json();
        
        if (data.categories) {
          setCategoriesList(data.categories);
        }
        if (data.menuItems) {
           const parsedItems = data.menuItems
             .filter((i: any) => i.inStock !== false)
             .map((i: any) => ({
               ...i,
               price: typeof i.price === 'string' ? parseFloat(i.price.replace('₹', '').replace(',', '')) : (i.price || 0)
             }));
           setMenuItemsList(parsedItems);
        }
        if (data.chefSelections) {
           const parsedChefs = data.chefSelections.map((i: any) => ({
             ...i,
             price: typeof i.price === 'string' ? parseFloat(i.price.replace('₹', '').replace(',', '')) : (i.price || 0)
           }));
           setChefsSelectionList(parsedChefs);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000); // sync every 10s
    return () => clearInterval(interval);
  }, []);

  const filteredItems = menuItemsList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );`;

const replacement2 = `          {/* Categories */}
          <div className="sticky top-[60px] z-10 bg-[#f8f9fa] flex gap-2.5 overflow-x-auto pb-3 pt-2 scrollbar-hide -mx-4 px-4 shadow-sm">
            <button onClick={() => setViewCategory('none')} className={\`px-5 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap shadow-sm \${viewCategory === 'none' ? 'bg-[#b34800] text-white' : 'bg-[#efefef] text-gray-600 hover:bg-gray-200'}\`}>
              Menu
            </button>
            {categoriesList.map(cat => (
              <button key={cat} onClick={() => setViewCategory(cat)} className={\`px-5 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap shadow-sm capitalize \${viewCategory === cat ? 'bg-[#b34800] text-white' : 'bg-[#efefef] text-gray-600 hover:bg-gray-200'}\`}>
                {cat.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Chef's Selection */}
          {viewCategory === 'none' && !searchQuery && chefsSelectionList.length > 0 && (
            <section>
              <h2 className="text-[19px] font-semibold mb-3.5 tracking-tight text-gray-900">Chef&apos;s Selection</h2>
              <div className="-mx-4 mb-2">
                <Swiper
                  spaceBetween={16}
                  slidesPerView={1.15}
                  slidesOffsetBefore={16}
                  slidesOffsetAfter={16}
                  className="pb-4"
                >
                  {chefsSelectionList.map((item, idx) => (
                    <SwiperSlide key={item.id}>
                      <div className="relative rounded-2xl overflow-hidden h-[200px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] w-full border border-gray-100">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute inset-0 p-4 flex flex-col justify-end">
                          <span className="bg-[#d35e00] text-white text-[10px] font-bold px-2 py-0.5 rounded-[4px] w-fit mb-2 tracking-wide">
                            FEATURED
                          </span>
                          <h3 className="text-[19px] font-bold text-white leading-tight mb-1 pr-4">
                            {item.name}
                          </h3>
                          <p className="text-white/90 text-[13px] mb-3 leading-snug w-[90%] line-clamp-2">
                            {item.desc}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-white font-bold text-[20px]">₹{item.price.toFixed(2)}</p>
                            <button 
                              onClick={() => addToCart(item, 1)}
                              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </section>
          )}

          {searchQuery && filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">No results found for "{searchQuery}"</p>
            </div>
          )}

          {/* Dynamic Category Sections */}
          {(viewCategory === 'none' ? categoriesList : [viewCategory]).map(category => {
            const categoryItems = filteredItems.filter(item => item.category === category);
            
            if (categoryItems.length === 0 && (!searchQuery || viewCategory !== 'none')) return null;

            return (
              <section key={category} className="pb-2">
                {viewCategory === 'none' ? (
                  <div className="flex items-end justify-between mb-3.5 mt-2">
                    <h2 className="text-[19px] font-semibold tracking-tight text-gray-900 capitalize">{category.toLowerCase()}</h2>
                    {!searchQuery && categoryItems.length > 3 && (
                      <button onClick={() => setViewCategory(category)} className="text-[#a64800] text-[13px] font-bold pb-0.5">
                        View All
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center mb-4 mt-2 gap-3">
                    <button onClick={() => setViewCategory('none')} className="p-2 -ml-2 text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
                      <ArrowLeft className="w-5 h-5 stroke-[2]" />
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 capitalize">{category.toLowerCase()}</h1>
                  </div>
                )}
                
                {viewCategory !== 'none' && categoryItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 font-medium">No items in this category.</p>
                  </div>
                )}

                <div className="space-y-3.5">
                  {(viewCategory === 'none' && !searchQuery ? categoryItems.slice(0, 3) : categoryItems).map(item => {
                    const cartItem = cart.find(i => i.id === item.id);
                    return (
                      <div key={item.id} className="p-4 rounded-[1.3rem] flex gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 bg-white">
                        <div className="relative w-20 h-20 rounded-[14px] overflow-hidden shrink-0 bg-[#f4f4f4] border border-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                        </div>
                        <div className="flex-1 flex flex-col justify-center py-0.5">
                          <div className="flex justify-between items-start mb-0.5">
                            <h3 className="font-bold text-[15px] leading-tight text-gray-900 pr-2">{item.name}</h3>
                            {item.tag && <span className="bg-[#ffe8d6] text-[#b34800] text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] shrink-0">{item.tag}</span>}
                          </div>
                          <p className="text-gray-500 text-[12px] leading-tight mb-2 pr-2 line-clamp-2">
                            {item.desc}
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-bold text-[#b34800] text-[16px]">₹{item.price.toFixed(2)}</span>
                            {cartItem ? renderQtyControl(item.id, cartItem.quantity) : (
                              <button 
                                onClick={() => addToCart(item, 1)}
                                className="bg-[#b34800] hover:bg-[#9e3b00] text-white text-[13px] font-bold px-[18px] h-[32px] rounded-lg transition-colors flex items-center justify-center">
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>`;

const newLines = [
  ...lines.slice(0, block1Start),
  replacement1,
  ...lines.slice(block1End + 1, block2Start),
  replacement2,
  ...lines.slice(block2End + 1)
];

fs.writeFileSync(file, newLines.join('\n'));
console.log("Patched successfully");
