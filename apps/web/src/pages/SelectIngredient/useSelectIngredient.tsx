// useSelectIngredient.ts
import { useState } from 'react';

// 材料のデータ型
export type IngredientItem = {
  id: string;
  emoji: string;
  label: string;
};

// ① あらかじめ用意されている4種類の具材
const initialIngredients: IngredientItem[] = [
  { id: 'item-1', emoji: '🥕', label: 'にんじん' },
  { id: 'item-2', emoji: '🍅', label: 'トマト' },
  { id: 'item-3', emoji: '🥔', label: 'じゃがいも' },
  { id: 'item-4', emoji: '🍖', label: 'お肉' },
];

export const useSelectIngredient = () => {
  // 画面に表示されるすべての具材リスト（初期値は上の4つ）
  const [availableItems, setAvailableItems] = useState<IngredientItem[]>(initialIngredients);
  
  // ② 選んだ材料を保存するリスト（条件通り「selectedChar」という名前にしています）
  const [selectedChar, setSelectedChar] = useState<string[]>([]);
  
  // 絵文字選択ウインドウの開閉状態
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  // 追加した具材の連番（ユーザー定義材料1, 2, 3...とするため）
  const [customCount, setCustomCount] = useState(1);

  // 具材をクリックした時の選択/解除ロジック
  const toggleSelection = (id: string) => {
    setSelectedChar((prev) => {
      // 既に選ばれていたら解除する
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      }
      // まだ選ばれていなくて、かつ3個未満なら追加する（最大3個まで）
      if (prev.length >= 3) {
        return prev; 
      }
      return [...prev, id];
    });
  };

  // ③ 新しい絵文字リストから具材を追加するロジック
const addCustomIngredient = (food: { emoji: string; label: string }) => {
  const newItem: IngredientItem = {
    id: `custom-${customCount}`,
    emoji: food.emoji,
    label: food.label,
  };
    
    // 選択可能な具材リストに追加し、カウンターを+1してウインドウを閉じる
    setAvailableItems((prev) => [...prev, newItem]);
    setCustomCount((c) => c + 1);
    setIsPickerOpen(false); 
  };

  // ④ 3つ選択されているかどうかの判定（これが true ならボタンを有効化）
  const isReady = selectedChar.length === 3;

  // UI側に渡したいデータと関数をreturn
  return {
    availableItems,
    selectedChar,
    isPickerOpen,
    setIsPickerOpen,
    toggleSelection,
    addCustomIngredient,
    isReady
  };
};