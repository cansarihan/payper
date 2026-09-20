# Payper · final pitch · 4–5 minutes

Two versions of the same speech. Numbers are read from the live deployment;
if you are asked, every one of them is checkable on chain.

---

## ENGLISH

### 1 · Cover  ·  ~25s

Good afternoon. We are Payper.

A supplier ships the goods, pays the wages, and then waits ninety days to be
paid. The capital that could close that gap exists — it is just sitting inside
domestic bank balance sheets, where a funder abroad cannot reach it.

We built the door.

### 2 · Problem  ·  ~45s

This is not a small market and it is not a speculative one. In our first
corridor, Türkiye, there are four million active enterprises and ninety-nine
point six percent of them are SMEs. The factoring sector turned over one point
eight seven five trillion lira last year across roughly ninety-five thousand
customers.

So the demand is proven. What that market does not have is two things.

First, a price anyone can check — the cost is quoted per deal, at a desk, with
no published rate to compare against.

Second, and this is the binding one: the capital is bank capital. A factor can
only advance what its own balance sheet allows, and that balance sheet is
bounded by the country it is licensed in. Someone abroad who would happily take
that risk at that price simply cannot reach it.

### 3 · Solution  ·  ~50s

Here is what we do.

A supplier uploads a signed e-invoice. The contract writes its ETTN — the tax
authority's unique identifier for that document — and refuses a second
registration of the same one.

The buyer acknowledges the debt on chain. From that moment the receivable is an
instrument anyone holding USDC can fund. In seconds. From fifty dollars.

The supplier is paid the same day, in lira, into a normal bank account. They
never touch crypto. The funder never opens an account in Türkiye.

### 4 · Architecture  ·  ~60s

Four Soroban contracts on testnet. Let me give you the parts that matter.

**One ETTN, one financing.** That is the product's single invariant, and it is
enforced by a contract, not by a database row. A licensed factor inside a
country with a central registry can already check one. A funder in Berlin
cannot — and the contract gives them the same guarantee without asking them to
join anything.

**The price is computed, not quoted.** Four components. Two of them are read
from chain on every single call, and every component carries its own
provenance — so a number that fell back to a parameter cannot be presented as
live. The interface labels it.

**The money reaches a bank account.** SEP-6, in both directions, against a real
anchor. The supplier sells USDC for lira; the buyer settles in lira at maturity.
Everything about that anchor is discovered at run time — moving to another one
is a single domain change.

### 5 · Competitive advantage  ·  ~35s

Two things make this different from the on-chain supply chain finance projects
that came before.

The first is that financing is bound to a **sovereign document identifier**. The
ETTN is issued by the tax authority and is unique per document, so uniqueness is
inherited from the tax system rather than maintained by us.

The second is verifiable pricing. Our DeFi yield is not a claim — our treasury
vault's code hash matches the hash DeFindex publishes, byte for byte. And the
rate itself is read live from a Blend v2 pool: one hundred and twenty-nine basis
points, on chain, right now, not configured.

### 6 · Honest limitations  ·  ~40s

I want to tell you what this does not solve, before you find it.

**Nobody bears the currency risk yet.** The funder's claim is fixed in USDC
while the buyer owes a fixed amount of lira. Over ninety days those stop
matching, and the contract does not say who absorbs the difference. We price
that risk into the discount — we do not assign it.

**The funder's claim has no legal wrapper.** The contract creates a pro-rata
economic interest in a payout, not an assignment of the receivable. What that is
under securities law differs by country, and production needs counsel.

**A fabricated invoice would pass our structural checks.** The gate is the
buyer's acknowledgement — the address on the invoice has to sign. What that does
not stop is collusion.

We would rather say these ourselves than have you find them.

### 7 · Business model  ·  ~30s

Fifty basis points on every funded invoice, embedded in the pricing engine
itself. A performance fee on treasury yield. A share of the FX conversion. And
an enterprise tier for corporate buyers.

Acquisition is the interesting part: we sell to the **buyer**, not the supplier.
One corporate buyer brings dozens of its suppliers with it, and the buyer's
acknowledgement is both our lock and our distribution channel.

### 8 · Roadmap and the ask  ·  ~35s

Next: a passkey smart account that verifies secp256r1 on chain, so a passkey
signs its own transactions. Integration with a production fiat anchor. Legal
structure. Then a closed pilot with one corporate buyer and its suppliers.

We are applying to the Stellar Community Fund and to InstaAwards.

### 9 · Close  ·  ~20s

Everything I have said is on payper.live right now, on testnet, and the README
gives you the commands to check each claim without trusting us.

One ETTN, one financing. The supplier is paid today. The funder never opens a
Turkish bank account.

Thank you.

---

## TÜRKÇE

### 1 · Kapak  ·  ~25 sn

İyi günler. Biz Payper.

Tedarikçi malı sevk ediyor, maaşı ödüyor, sonra parasını doksan gün bekliyor. O
açığı kapatacak sermaye var — sadece yurt içi bankaların bilançosunda duruyor ve
yurt dışındaki bir fonlayıcı oraya erişemiyor.

Biz o kapıyı açtık.

### 2 · Problem  ·  ~45 sn

Bu küçük bir pazar değil ve spekülatif de değil. İlk koridorumuz Türkiye'de dört
milyon aktif girişim var, yüzde doksan dokuz virgül altısı KOBİ. Faktoring
sektörü geçen yıl yaklaşık doksan beş bin müşteri üzerinden bir virgül sekiz yüz
yetmiş beş trilyon lira hacim döndürdü.

Yani talep kanıtlı. Bu pazarda olmayan iki şey var.

Birincisi, kimsenin kontrol edebileceği bir fiyat. Maliyet masa başında, her
işlem için ayrı söyleniyor; karşılaştırılacak yayımlanmış bir oran yok.

İkincisi — ve asıl kısıt bu — sermaye banka sermayesi. Bir faktoring şirketi
ancak kendi bilançosunun izin verdiği kadar avans verebiliyor ve o bilanço,
lisanslı olduğu ülkeyle sınırlı. Bu riski o fiyata almaya razı yabancı biri ise
o sermayeye hiç erişemiyor.

### 3 · Çözüm  ·  ~50 sn

Yaptığımız şey şu.

Tedarikçi imzalı e-faturasını yüklüyor. Kontrat faturanın ETTN'ini yazıyor —
vergi idaresinin o belgeye verdiği tekil kimlik — ve aynısının ikinci kez
kaydedilmesini reddediyor.

Alıcı borcu zincir üstünde onaylıyor. O andan itibaren alacak, USDC tutan
herkesin fonlayabildiği bir enstrüman. Saniyeler içinde. Elli dolardan
başlayarak.

Tedarikçiye aynı gün, lira olarak, normal banka hesabına ödeniyor. Kriptoya hiç
dokunmuyor. Fonlayıcı da Türkiye'de hesap açmıyor.

### 4 · Mimari  ·  ~60 sn

Testnet'te dört Soroban kontratı. Önemli parçaları söyleyeyim.

**Bir ETTN, bir finansman.** Ürünün tek değişmezi bu ve bir veritabanı satırı
değil, kontrat kuralı. Merkezi kaydı olan bir ülkedeki lisanslı faktoring
şirketi bunu zaten kontrol edebiliyor. Berlin'deki bir fonlayıcı edemiyor — ve
kontrat ona aynı garantiyi, hiçbir yere üye olmasını istemeden veriyor.

**Fiyat hesaplanıyor, dayatılmıyor.** Dört bileşen. İkisi her çağrıda zincirden
okunuyor ve her bileşen kendi kaynağını taşıyor — yani parametreye düşen bir
sayı canlı diye sunulamıyor. Arayüz etiketliyor.

**Para bankaya ulaşıyor.** SEP-6, çift yönlü, gerçek bir anchor üzerinden.
Tedarikçi USDC'yi liraya çeviriyor, alıcı vadede lira ile kapatıyor. Anchor'a
dair her şey çalışma anında keşfediliyor — başka bir anchor'a geçmek tek alan
adı değişikliği.

### 5 · Rekabet avantajı  ·  ~35 sn

Bizi önceki zincir üstü tedarik zinciri finansmanı projelerinden ayıran iki şey
var.

Birincisi, finansmanın **devlet tarafından verilen bir belge kimliğine** bağlı
olması. ETTN'i vergi idaresi veriyor ve her belge için tekil, yani tekillik bizim
tuttuğumuz bir kayıttan değil, vergi sisteminden geliyor.

İkincisi doğrulanabilir fiyatlama. DeFi getirimiz bir iddia değil — hazine
kasamızın kod hash'i, DeFindex'in yayımladığı hash ile bayt bayt aynı. Oranın
kendisi de canlı olarak bir Blend v2 havuzundan okunuyor: yüz yirmi dokuz baz
puan, şu anda, zincirden, yapılandırmadan değil.

### 6 · Dürüst sınırlılıklar  ·  ~40 sn

Siz bulmadan önce, bunun neyi çözmediğini söylemek istiyorum.

**Kur riskini henüz kimse taşımıyor.** Fonlayıcının hakkı USDC cinsinden sabit,
alıcı ise sabit bir lira tutarı borçlu. Doksan günde bu ikisi uyuşmayı
bırakıyor ve kontrat farkı kimin soğuracağını söylemiyor. Riski iskontoya
fiyatlıyoruz — ama atamıyoruz.

**Fonlayıcının hakkının hukuki kabı yok.** Kontrat temlik değil, ödeme üzerinde
oransal bir ekonomik katılım yaratıyor. Bunun menkul kıymet mevzuatı açısından ne
olduğu ülkeye göre değişiyor ve üretim için hukuki görüş gerekiyor.

**Uydurma bir fatura yapısal kontrollerimizden geçer.** Kapı alıcının onayı —
faturada yazılı adresin imzalaması gerekiyor. Durdurmadığı şey muvazaa.

Bunları sizin bulmanızı beklemektense kendimiz söylemeyi tercih ederiz.

### 7 · İş modeli  ·  ~30 sn

Fonlanan her faturada elli baz puan, doğrudan fiyatlama motorunun içine gömülü.
Hazine getirisinden performans ücreti. Kur dönüşümünden pay. Ve kurumsal alıcılar
için kurumsal abonelik.

İlginç kısmı müşteri kazanımı: biz **alıcıya** satıyoruz, tedarikçiye değil. Bir
kurumsal alıcı, onlarca tedarikçisini beraberinde getiriyor — ve alıcının onayı
hem kilidimiz hem dağıtım kanalımız.

### 8 · Yol haritası ve talep  ·  ~35 sn

Sırada: secp256r1'i zincirde doğrulayan bir passkey akıllı hesabı, böylece
passkey kendi işlemini imzalayabilsin. Üretim fiat anchor'ı entegrasyonu. Hukuki
yapı. Sonra bir kurumsal alıcı ve tedarikçileriyle kapalı pilot.

Stellar Community Fund ve InstaAwards'a başvuruyoruz.

### 9 · Kapanış  ·  ~20 sn

Söylediğim her şey şu anda payper.live'da, testnet üzerinde çalışıyor — ve
README, her iddiayı bize güvenmeden kontrol edebileceğiniz komutları veriyor.

Bir ETTN, bir finansman. Tedarikçi bugün ödeniyor. Fonlayıcı hiçbir zaman Türk
bankasında hesap açmıyor.

Teşekkürler.

---

## Delivery notes

- Total is about four and a half minutes at a normal pace. If you are cut to
  four, drop the business model slide — the roadmap carries enough of it.
- The two lines worth slowing down for: **"one ETTN, one financing"** and
  **"we would rather say these ourselves than have you find them."**
- If a judge interrupts on DeFindex, the answer is one sentence: *the vault holds
  the position, the rate is read from Blend, and our vault's code hash matches
  theirs byte for byte.*
- If asked whether the user really signs: *a connected wallet signs its own
  transactions; the server prepares the call and hands over an unsigned envelope.*
