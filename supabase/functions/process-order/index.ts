
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIsimport "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

Deno.serve(async (req) => {
  if (req.method === "POST") {
    const { user_id, shipping_address, recipient_name, items } = await req.json();

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          { user_id, shipping_address, recipient_name },
        ])
        .select();

      if (orderError) throw orderError;

      const orderId = order[0].id;

      for (const item of items) {
        const { item_id, quantity, total_price } = item;

        const { error: itemError } = await supabase
          .from("order_items")
          .insert([
            { order_id: orderId, item_id, quantity, total_price },
          ]);

        if (itemError) throw itemError;
      }

      const { data: orderTotals, error: totalsError } = await supabase
        .from("order_items")
        .select("total_price");

      if (totalsError) throw totalsError;

      const totalSum = orderTotals.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

      return new Response(JSON.stringify({ message: "Order processed successfully", totalSum }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
  } else {
    return new Response("Method Not Allowed", { status: 405 });
  }
});
