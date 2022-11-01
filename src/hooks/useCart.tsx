import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product} from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  /* pega referencia*/
  const cartRef = useRef<Product[]>()
  /* usa o useeffect pra guardar o valor antigo do cart cada vez que ele renderiza */
  useEffect(()=>{
    cartRef.current =  cart
  })
  /* se o valor for falso atribui o valor CART, se for verdadeiro atribui o valor CARTREF*/
  const cartPreviousValue = cartRef.current  ?? cart

  useEffect(()=>{
    /* se HOUVE ALTERACAO ELES SAO DIFERENTES ENTAO CAI NO IF E GUARDA NOVO VALOR*/
    if(cartPreviousValue !== cart){
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      
    }

  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      /* o updated cart nao ta apontando diretamente para o cart, entao posso usar o
      push por exemplo para adicionar produtos nesse array sem quebrar a regra da imutabilidade*/

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        /* usando o push para adicionar o campo amount */
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
     
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
        
      }
      else{
        throw Error()
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return
      }
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)
      
      if(amount > stockAmount){
        toast.error("Quantidade solicitada fora de estoque");
        return
      }

      if(productExists){
        productExists.amount = amount
        setCart(updatedCart)
      }else{
        throw Error()
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
