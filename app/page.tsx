'use client'

// Removed Image import from next/image to support raw base64 data URLs via native <img>.
import { Search, Utensils, ClipboardList, ShoppingBag, User as UserIcon, Minus, Plus, ShoppingCart, User, Clock, CheckCircle2, Trash2, CreditCard, MapPin, Bell, Shield, LogOut, ChevronRight, Settings, ArrowLeft, ScanLine } from "lucide-react"
import { useState } from "react"
import { Scanner } from '@yudiel/react-qr-scanner';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

import { useEffect } from "react"

export default function Home() {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'cart' | 'profile'>('menu')
  const [viewCategory, setViewCategory] = useState<string>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scannedTable, setScannedTable] = useState<string | null>(null)

  const [menuItemsList, setMenuItemsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [chefsSelectionList, setChefsSelectionList] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [myOrderIds, setMyOrderIds] = useState<string[]>([]);

  useEffect(() => {
    // Load saved orders on mount
    const savedOrders = localStorage.getItem('myOrderIds');
    if (savedOrders) {
      try {
        setMyOrderIds(JSON.parse(savedOrders));
      } catch(e) {}
    }
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
        if (data.liveOrders) {
           setLiveOrders(data.liveOrders);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000); // sync every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table');
      if (tableParam) {
        const match = tableParam.match(/table-(\w+)/i) || tableParam.match(/^(\w+)$/);
        if (match) {
          setScannedTable(match[1]);
        }
      }
    }
  }, []);

  const filteredItems = menuItemsList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.desc && item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [cart, setCart] = useState<Array<{id: string; name: string; price: number; image: string; quantity: number; instructions?: string; showInstructions?: boolean}>>([]);

  const addToCart = (item: {id: string, name: string, price: number, image: string}, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }

  const updateItemInstructions = (id: string, instructions: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, instructions } : item));
  }

  const toggleItemInstructions = (id: string, show: boolean) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, showInstructions: show } : item));
  }

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartGst = cartSubtotal * 0.05;
  const cartRestaurantCharges = cart.length > 0 ? 1.50 : 0;
  const cartTotal = cartSubtotal + cartGst + cartRestaurantCharges;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const renderQtyControl = (id: string, qty: number) => (
    <div className="flex items-center bg-[#f4f4f4] rounded-lg px-2 py-1 gap-3 h-[32px]">
      <button onClick={() => updateQuantity(id, -1)} className="p-0.5 text-[#b34800] hover:text-[#9e3b00] transition-colors">
        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
      <span className="font-bold text-[14px] w-3 text-center">{qty}</span>
      <button onClick={() => updateQuantity(id, 1)} className="p-0.5 text-[#b34800] hover:text-[#9e3b00] transition-colors">
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  )

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const orderData = {
        table: scannedTable && scannedTable !== 'Scanned' ? scannedTable : 'Takeaway',
        section: 'main',
        time: timeString,
        status: 'new',
        items: cart.map(i => ({ qty: i.quantity, name: i.name, price: i.price.toString() })),
        total: cartTotal.toFixed(2)
      };

      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      const newOrder = await res.json();
      
      if (newOrder && newOrder.id) {
        const updatedIds = [...myOrderIds, newOrder.id];
        setMyOrderIds(updatedIds);
        localStorage.setItem('myOrderIds', JSON.stringify(updatedIds));
        setCart([]);
        setActiveTab('orders');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to place order');
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24 font-sans text-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-100/50">
        <h1 className="text-xl font-bold text-[#9e3b00] tracking-tight shrink-0 mr-1">LumiDine</h1>
        <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <Search className="w-[18px] h-[18px] text-gray-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Search menu..." 
            className="bg-transparent border-none outline-none text-[14px] w-full text-gray-900 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={() => { setIsScannerOpen(true); setScannerError(null); }} className="hover:opacity-70 transition-opacity">
          <ScanLine className="w-[22px] h-[22px] stroke-[2.5] text-gray-400 shrink-0 ml-1 cursor-pointer hover:text-gray-600 transition-colors" />
        </button>
      </header>

      {/* QR Scanner Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex justify-between items-center px-5 py-4 bg-black/60 absolute top-0 w-full z-10 backdrop-blur-sm">
            <h2 className="text-white font-bold text-[18px]">Scan QR Code</h2>
            <button onClick={() => setIsScannerOpen(false)} className="text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            {scannerError ? (
              <div className="text-center p-6 text-white">
                <div className="bg-red-500/20 text-red-100 p-4 rounded-2xl border border-red-500/50 mb-4 max-w-sm mx-auto">
                  <p className="font-semibold mb-1">Camera Error</p>
                  <p className="text-sm opacity-90">{scannerError}</p>
                </div>
                <button 
                  onClick={() => setIsScannerOpen(false)}
                  className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl transition-colors text-sm font-medium">
                  Go Back
                </button>
              </div>
            ) : (
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const text = result[0].rawValue || '';
                    const match = text.match(/table-(\w+)/i);
                    if (match) {
                      setScannedTable(match[1]);
                    } else {
                      setScannedTable('Scanned'); // fallback if no table number found in QR
                    }
                    setIsScannerOpen(false);
                  }
                }} 
                onError={(error) => {
                  console.error(error?.message);
                  setScannerError(error?.message || 'Failed to access camera');
                }}
                components={{
                  finder: true,
                }}
                styles={{
                  container: { width: '100%', height: '100%' }
                }}
              />
            )}
          </div>
          {!scannerError && (
            <div className="absolute top-[80px] w-full text-center z-10 p-4">
              <p className="text-white/80 font-medium text-[15px] bg-black/40 inline-flex px-4 py-2 rounded-full backdrop-blur-md">
                Point camera at table QR code
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'menu' && (
        <main className="px-4 space-y-7 max-w-md mx-auto">
          {/* Table Banner */}
          {scannedTable && (
            <div className="bg-[#c25100] rounded-[1.25rem] p-4 flex items-center justify-between text-white shadow-sm mt-1">
              <div className="flex items-center gap-4">
                <Utensils className="w-6 h-6 stroke-[2]" />
                <div className="flex flex-col">
                  <span className="font-bold text-[15px] leading-tight">
                    {scannedTable === 'Scanned' ? 'Ready to Order' : `Table ${scannedTable}`}
                  </span>
                  <span className="text-[13px] text-white/90">Ready for your order</span>
                </div>
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="sticky top-[60px] z-10 bg-[#f8f9fa] flex gap-2.5 overflow-x-auto pb-3 pt-2 scrollbar-hide -mx-4 px-4 shadow-sm">
            <button onClick={() => setViewCategory('none')} className={`px-5 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap shadow-sm ${viewCategory === 'none' ? 'bg-[#b34800] text-white' : 'bg-[#efefef] text-gray-600 hover:bg-gray-200'}`}>
              Menu
            </button>
            {categoriesList.map(cat => (
              <button key={cat} onClick={() => setViewCategory(cat)} className={`px-5 py-2 rounded-full text-[14px] font-semibold whitespace-nowrap shadow-sm capitalize ${viewCategory === cat ? 'bg-[#b34800] text-white' : 'bg-[#efefef] text-gray-600 hover:bg-gray-200'}`}>
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
        </main>
      )}
      {activeTab === 'orders' && (
        <main className="px-4 space-y-5 max-w-md mx-auto pt-4 pb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Your Orders</h1>

          {(() => {
            const myOrders = liveOrders.filter(o => myOrderIds.includes(o.id)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            
            const activeOrders = myOrders.filter(o => o.status === 'new' || o.status === 'preparing' || o.status === 'urgent');
            const pastOrders = myOrders.filter(o => o.status === 'served' || o.status === 'paid');

            if (myOrders.length === 0) {
              return (
                <div className="text-center py-10 bg-white rounded-[1.3rem] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100">
                  <p className="text-gray-500 font-medium mb-4">You have no orders yet</p>
                  <button onClick={() => setActiveTab('menu')} className="bg-[#fff0e6] text-[#b34800] font-bold text-[14px] py-2 px-6 rounded-lg">
                    Browse Menu
                  </button>
                </div>
              );
            }

            return (
              <>
                {/* Active Orders */}
                {activeOrders.length > 0 && (
                  <section>
                    <h2 className="text-[15px] font-semibold mb-3 text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#c25100] animate-pulse" />
                      Active Orders
                    </h2>
                    <div className="space-y-4">
                      {activeOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-[1.3rem] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100 flex flex-col gap-4">
                          <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                            <div>
                              <p className="font-bold text-[16px] text-gray-900 mb-1">Order #{order.id.slice(-4)}</p>
                              <p className="text-[13px] text-gray-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {order.time}
                              </p>
                            </div>
                            <span className="bg-[#fff0e6] text-[#b34800] text-[11px] font-extrabold px-2.5 py-1 rounded-md shrink-0 uppercase">
                              {order.status}
                            </span>
                          </div>
                          
                          <div className="space-y-2.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[14px]">
                                <span className="font-medium text-gray-800"><span className="text-gray-400 mr-2">{item.qty}x</span>{item.name}</span>
                                <span className="font-semibold text-gray-900">₹{(item.qty * parseFloat(item.price)).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                            <span className="text-[14px] text-gray-500 font-medium">Total</span>
                            <span className="font-bold text-[16px] text-gray-900">₹{order.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Past Orders */}
                {pastOrders.length > 0 && (
                  <section className="pt-2">
                    <h2 className="text-[15px] font-semibold mb-3 text-gray-900">Past Orders</h2>
                    
                    <div className="space-y-3.5">
                      {pastOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-[1.3rem] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100 flex flex-col gap-3 opacity-70">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-[15px] text-gray-900 mb-0.5">Order #{order.id.slice(-4)}</p>
                              <p className="text-[12px] text-gray-500">{order.time}</p>
                            </div>
                            <span className="flex items-center gap-1 text-[#2e7d32] text-[12px] font-bold uppercase">
                              <CheckCircle2 className="w-4 h-4" /> {order.status}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <p key={idx} className="text-[13px] text-gray-600 font-medium line-clamp-1">
                                {item.qty}x {item.name}
                              </p>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-1">
                            <span className="font-bold text-[15px] text-gray-900">₹{order.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            );
          })()}
        </main>
      )}

      {activeTab === 'cart' && (
        <main className="px-4 space-y-5 max-w-md mx-auto pt-4 pb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Your Cart</h1>

          {/* Cart Items */}
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-[1.3rem] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100">
                <p className="text-gray-500 font-medium mb-4">Your cart is empty</p>
                <button onClick={() => setActiveTab('menu')} className="bg-[#fff0e6] text-[#b34800] font-bold text-[14px] py-2 px-6 rounded-lg">
                  Browse Menu
                </button>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white rounded-[1.3rem] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100 flex flex-col gap-3">
                  <div className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-[14px] overflow-hidden shrink-0 bg-[#f4f4f4] border border-gray-100">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-[15px] leading-tight text-gray-900 pr-2">{item.name}</h3>
                        <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-[#d32f2f] transition-colors"><Trash2 className="w-[18px] h-[18px]" /></button>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-[#b34800] text-[16px]">₹{(item.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center bg-[#f4f4f4] rounded-lg px-1.5 py-1.5 gap-3">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-0.5 text-gray-500 hover:text-gray-800 transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-[14px] w-3 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-0.5 text-gray-500 hover:text-gray-800 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-50 pt-2 mt-1">
                    {!item.showInstructions ? (
                      <button 
                        onClick={() => toggleItemInstructions(item.id, true)}
                        className="w-full text-left text-[13px] font-medium transition-colors flex justify-between items-center py-1">
                        {item.instructions ? (
                           <span className="text-gray-900 line-clamp-1"><span className="font-semibold mr-1">Note:</span>{item.instructions}</span>
                        ) : (
                           <span className="text-gray-500">+ Add cooking instructions or allergy info</span>
                        )}
                        {item.instructions && <span className="text-[#b34800] text-[12px] font-bold shrink-0 ml-2">Edit</span>}
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] font-semibold text-gray-900">Cooking Instructions</span>
                          <button 
                            onClick={() => toggleItemInstructions(item.id, false)}
                            className="text-[12px] text-[#b34800] font-bold hover:opacity-80 transition-opacity">
                            Done
                          </button>
                        </div>
                        <textarea 
                          value={item.instructions || ''}
                          onChange={(e) => updateItemInstructions(item.id, e.target.value)}
                          placeholder="e.g. No onions, extra spicy..."
                          className="w-full bg-[#f8f9fa] border border-gray-100 rounded-lg p-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-[#b34800] focus:border-[#b34800] outline-none min-h-[60px] resize-none"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <section className="pt-4">
              <h2 className="text-[17px] font-semibold mb-4 text-gray-900">Order Summary</h2>
              <div className="bg-white rounded-[1.3rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-gray-100 space-y-3">
                <div className="flex justify-between text-[14px] text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[14px] text-gray-600">
                  <span>GST (5%)</span>
                  <span className="font-medium text-gray-900">₹{cartGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[14px] text-gray-600">
                  <span>Restaurant Charges</span>
                  <span className="font-medium text-gray-900">₹{cartRestaurantCharges.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-[16px] text-gray-900">Total</span>
                  <span className="font-bold text-[18px] text-[#b34800]">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </section>
          )}

          {cart.length > 0 && (
            <button onClick={handlePlaceOrder} className="w-full bg-[#b34800] hover:bg-[#9e3b00] text-white font-bold py-4 rounded-xl text-[16px] shadow-sm transition-colors mt-2 pb-6 mb-2">
              Confirm & Pay ₹{cartTotal.toFixed(2)}
            </button>
          )}
        </main>
      )}

      {activeTab === 'profile' && (
        <main className="px-4 space-y-6 max-w-md mx-auto pt-4 pb-8">
          {/* User Profile Header */}
          <div className="flex items-center gap-4 bg-white rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="w-16 h-16 rounded-full bg-[#fff0e6] flex items-center justify-center text-[#b34800] font-bold text-2xl shrink-0">
              JS
            </div>
            <div className="flex-1">
              <h1 className="text-[19px] font-bold text-gray-900 leading-tight">John Smith</h1>
              <p className="text-[14px] text-gray-500">john.smith@example.com</p>
              <p className="text-[13px] text-[#b34800] font-semibold mt-1">+91 98765 43210</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600 self-start mt-1">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Options */}
          <section className="space-y-4">
            <h2 className="text-[15px] font-semibold text-gray-900 ml-1">Account & Settings</h2>
            
            <div className="bg-white rounded-[1.3rem] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col">
              <button className="flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] flex items-center justify-center text-gray-500">
                    <CreditCard className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-800">Payment Methods</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button className="flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] flex items-center justify-center text-gray-500">
                    <MapPin className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-800">Saved Addresses</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button className="flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] flex items-center justify-center text-gray-500">
                    <Bell className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-800">Notifications</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              <button className="flex items-center justify-between p-4 bg-white hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] flex items-center justify-center text-gray-500">
                    <Shield className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-800">Privacy & Security</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </section>

          {/* Logout */}
          <button className="w-full flex items-center justify-center gap-2 bg-[#fff0e6] hover:bg-[#ffe0cc] text-[#d32f2f] font-bold py-4 rounded-xl text-[16px] transition-colors mt-6 mb-2">
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </main>
      )}

      {/* Floating Cart Button (only on menu tab) */}
      {activeTab === 'menu' && cart.length > 0 && (
        <div className="fixed bottom-[90px] right-4 flex justify-end pointer-events-none z-20">
          <button 
            onClick={() => setActiveTab('cart')}
            className="pointer-events-auto bg-[#ab4500] text-white rounded-full py-2.5 px-4 flex items-center gap-[14px] shadow-xl hover:bg-[#913b00] transition-colors shadow-[#a64800]/25 border border-[#c25100]/50">
            <div className="relative ml-1">
              <ShoppingBag className="w-6 h-6 shrink-0" />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-[#a64800] text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-[#ab4500]">
                {cartItemCount}
              </span>
            </div>
            <div className="flex flex-col items-start pr-2">
              <span className="text-[9px] font-extrabold tracking-wider opacity-90 mb-[1px]">VIEW CART</span>
              <span className="font-extrabold text-[16px] leading-none mb-0.5">₹{cartTotal.toFixed(2)}</span>
            </div>
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white flex justify-around items-center pt-2 pb-6 px-2 shadow-[0_-10px-30px-rgba(0,0,0,0.04)] z-30 mb-[-1px]">
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center w-16 gap-[5px] transition-colors ${activeTab === 'menu' ? 'text-[#b34800]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className={`${activeTab === 'menu' ? 'bg-[#fff0e6]' : ''} py-1.5 px-4 rounded-full flex items-center justify-center transition-colors`}>
            <Utensils className={`w-[22px] h-[22px] ${activeTab === 'menu' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </div>
          <span className={`text-[11px] ${activeTab === 'menu' ? 'font-bold' : 'font-medium mt-[1px]'}`}>Menu</span>
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center justify-center w-16 gap-[5px] transition-colors ${activeTab === 'orders' ? 'text-[#b34800]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className={`${activeTab === 'orders' ? 'bg-[#fff0e6]' : ''} py-1.5 px-4 rounded-full flex items-center justify-center transition-colors`}>
            <ClipboardList className={`w-[22px] h-[22px] ${activeTab === 'orders' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </div>
          <span className={`text-[11px] ${activeTab === 'orders' ? 'font-bold' : 'font-medium mt-[1px]'}`}>Orders</span>
        </button>
        <button 
          onClick={() => setActiveTab('cart')}
          className={`flex flex-col items-center justify-center w-16 gap-[5px] transition-colors ${activeTab === 'cart' ? 'text-[#b34800]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className={`${activeTab === 'cart' ? 'bg-[#fff0e6]' : ''} relative py-1.5 px-4 rounded-full flex items-center justify-center transition-colors`}>
            <ShoppingCart className={`w-[22px] h-[22px] ${activeTab === 'cart' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            {cartItemCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-[#d32f2f] rounded-full" />
            )}
          </div>
          <span className={`text-[11px] ${activeTab === 'cart' ? 'font-bold' : 'font-medium mt-[1px]'}`}>Cart</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center w-16 gap-[5px] transition-colors ${activeTab === 'profile' ? 'text-[#b34800]' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className={`${activeTab === 'profile' ? 'bg-[#fff0e6]' : ''} py-1.5 px-4 rounded-full flex items-center justify-center transition-colors`}>
            <UserIcon className={`w-[22px] h-[22px] ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
          </div>
          <span className={`text-[11px] ${activeTab === 'profile' ? 'font-bold' : 'font-medium mt-[1px]'}`}>Profile</span>
        </button>
      </nav>
    </div>
  )
}

