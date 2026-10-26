import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export type DeckCategory = { id: string; name: string };

// Elenco personale dei mazzi dell'utente (gestito da Impostazioni), senza limiti.
// Usato per selezionare un mazzo già usato invece di riscriverlo ogni volta a mano.
export function useDeckCategories() {
  const { session } = useAuth();
  const [decks, setDecks] = useState<DeckCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("deck_categories")
      .select("id,name")
      .eq("user_id", session.user.id)
      .order("name", { ascending: true });
    setDecks(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { reload(); }, [reload]);

  async function addDeck(name: string): Promise<DeckCategory | null> {
    const trimmed = name.trim();
    if (!trimmed || !session?.user?.id) return null;
    const { data, error } = await supabase
      .from("deck_categories")
      .insert({ user_id: session.user.id, name: trimmed })
      .select()
      .single();
    if (error) {
      // probabilmente esiste già (vincolo unique): ricarico e basta
      await reload();
      return decks.find((d) => d.name.toLowerCase() === trimmed.toLowerCase()) || null;
    }
    await reload();
    return data as DeckCategory;
  }

  async function removeDeck(id: string) {
    await supabase.from("deck_categories").delete().eq("id", id);
    await reload();
  }

  return { decks, loading, addDeck, removeDeck, reload };
}
