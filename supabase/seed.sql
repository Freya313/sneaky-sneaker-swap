-- =======================================================================
-- DEMO SEED — 10 aesthetic sneaker listings with Unsplash photos
-- Run this once in the Supabase SQL editor AFTER at least one user
-- has signed up. All listings will appear under that first account.
-- =======================================================================

DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- grab the first registered user
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'No users found. Sign up first, then re-run this script.';
    RETURN;
  END IF;

  -- skip if listings already exist to avoid duplicates
  IF (SELECT count(*) FROM public.listings) > 2 THEN
    RAISE NOTICE 'Listings already exist — skipping seed.';
    RETURN;
  END IF;

  INSERT INTO public.listings
    (user_id, brand, model, size, size_system, condition, color,
     price, pickup_location, description, authenticity_note, photos, status)
  VALUES

    -- 1 · Nike Air Max 90
    (v_uid, 'Nike', 'Air Max 90', 42, 'EU', 'Good', 'White / Black', 85,
     'Maison des Étudiants',
     'Classic Air Max 90 in white and black. Light creasing on the toe box from regular wear but soles are clean and the air unit is intact. Comes with the original laces.',
     'Purchased at Foot Locker Paris in 2023. Receipt available on request.',
     ARRAY[
       'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85',
       'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85&crop=entropy'
     ],
     'active'),

    -- 2 · Jordan Air Jordan 1 Low
    (v_uid, 'Jordan', 'Air Jordan 1 Low', 43, 'EU', 'Very good', 'Black / Red', 120,
     'Cafétéria',
     'Bred Jordan 1 Lows worn maybe 10 times for going out. No significant creasing on the toe — the outsole has barely touched the ground. A grail for the right price.',
     'Original Nike Jordan box included. Purchased at Courir Paris, 2023.',
     ARRAY[
       'https://images.unsplash.com/photo-1552346154-21d32204b3b3?auto=format&fit=crop&w=800&q=85',
       'https://images.unsplash.com/photo-1556906781-9a412961a28c?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 3 · Converse Chuck Taylor
    (v_uid, 'Converse', 'Chuck Taylor All Star', 40, 'EU', 'Good', 'White Canvas', 35,
     'Library entrance',
     'Classic white Chucks — canvas is clean, rubber sole has some light yellowing. Worn a lot to class, which gives them that perfect broken-in feel. The most campus shoe ever.',
     'Authentic. Bought at the Converse store on Rue de Rivoli.',
     ARRAY[
       'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=85',
       'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 4 · Adidas Stan Smith
    (v_uid, 'Adidas', 'Stan Smith', 41, 'EU', 'Very good', 'White / Green', 65,
     'Bâtiment A, rez-de-chaussée',
     'Stan Smiths in very good shape — minimal creasing on the leather toe box, clean overall. Worn mostly indoors at the residence. A timeless pair that goes with everything.',
     'Authentic. Original box available. Adidas store purchase, receipt on request.',
     ARRAY[
       'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 5 · Vans Old Skool
    (v_uid, 'Vans', 'Old Skool', 42, 'EU', 'Good', 'Black / White', 45,
     'Salle commune',
     'Black and white Old Skools with the classic side stripe. The suede shows natural wear on the toe cap — patina, not damage. Cleaned with suede brush before listing.',
     'Authentic Vans. Purchased at Vans.eu. No box.',
     ARRAY[
       'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=85',
       'https://images.unsplash.com/photo-1484589065579-248aad0d8b13?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 6 · New Balance 574
    (v_uid, 'New Balance', '574', 44, 'EU', 'Good', 'Navy / Grey', 70,
     'Gymnase',
     'NB 574 in navy and grey. The suede panels have softened beautifully from wear — that worn-in look that takes months to achieve. No damage, just well-loved.',
     'Authentic New Balance. Bought at the NB concept store near the Marais.',
     ARRAY[
       'https://images.unsplash.com/photo-1539185441755-9109504f5ad1?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 7 · Nike Air Force 1
    (v_uid, 'Nike', 'Air Force 1 Low', 42, 'EU', 'Very good', 'Triple White', 90,
     'Maison des Étudiants',
     'Triple-white AF1s that I kept very clean — crep protect spray after every wear. Slight natural sole yellowing from age which is expected and actually makes them look better.',
     'Original receipt and box available. Purchased at the Nike flagship on Champs-Élysées.',
     ARRAY[
       'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=85',
       'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 8 · Adidas Yeezy Boost 350 V2
    (v_uid, 'Adidas', 'Yeezy Boost 350 V2', 43, 'EU', 'Good', 'Cream / Core White', 185,
     'Cafétéria',
     'Cream white Yeezy 350 V2. Some midsole scuffing from regular use, uppers still in great condition with no staining. The boost is still super bouncy. Rare size.',
     'Authenticated by Stadium Goods Paris. Authentication card and original box included.',
     ARRAY[
       'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 9 · Nike Dunk Low
    (v_uid, 'Nike', 'Dunk Low', 43, 'EU', 'Very good', 'Muted Green / White', 148,
     'Library entrance',
     'Nike Dunk Lows in a muted forest green and white. Worn about five times — barely any toe crease. Original insole still fresh. Laces still crisp white.',
     'Original box included. Limited drop purchase from Nike.com — order confirmation available.',
     ARRAY[
       'https://images.unsplash.com/photo-1584735175315-9d5df23be619?auto=format&fit=crop&w=800&q=85',
       'https://images.unsplash.com/photo-1613987245117-50933bcb3240?auto=format&fit=crop&w=800&q=85'
     ],
     'active'),

    -- 10 · Puma Suede Classic
    (v_uid, 'Puma', 'Suede Classic', 41, 'EU', 'Good', 'Royal Blue / White', 40,
     'Aile ouest, chambre 204',
     'Puma Suede Classics in royal blue. The suede has a natural lived-in softness — this is character, not damage. Cleaned with a dry suede brush before listing. Very comfortable for a long day on campus.',
     'Authentic Puma. Purchased at Sport 2000 in Paris.',
     ARRAY[
       'https://images.unsplash.com/photo-1543508282-6319a3eb2ad1?auto=format&fit=crop&w=800&q=85'
     ],
     'active');

  RAISE NOTICE 'Seeded 10 demo listings for user %.', v_uid;
END;
$$;
