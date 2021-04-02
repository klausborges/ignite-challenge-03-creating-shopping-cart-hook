import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stockProduct } = await api.get<Stock>(`stock/${productId}`);

      const findProduct = cart.find((product) => product.id === productId);
      if (findProduct && findProduct.amount + 1 > stockProduct.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      
      const { data: newProduct } = await api.get<Product>(`products/${productId}`);
      const updatedCart = findProduct
        ? cart.map((product) => (
          product.id !== productId
            ? product
            : {
              ...product,
              amount: product.amount + 1,
            }
        ))
        : [...cart, { ...newProduct, amount: 1 }];

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isItemInCart = cart.find((product) => product.id === productId);
      if (!isItemInCart) {
        throw new Error();
      }

      const updatedCart = cart.filter((product) => product.id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: stockProduct } = await api.get<Product>(`stock/${productId}`);

      if (amount >= stockProduct.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const findProduct = cart.find((product) => product.id === productId);
      if (!findProduct) {
        throw new Error();
      }

      const updatedCart = cart.map((product) => (
        product.id !== productId
          ? product
          : {
            ...product,
            amount,
          }
      ));

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
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
