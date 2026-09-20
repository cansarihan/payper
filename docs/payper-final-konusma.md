# Payper · final pitch · 4–5 minutes

Two versions of the same speech. Numbers are read from the live deployment;
if you are asked, every one of them is checkable on chain.

---

## ENGLISH

*Simple English, short sentences. Every number here is real and you can check it
on chain.*

### 1 · Cover  ·  ~25s

Good afternoon. We are Payper.

A supplier sends the goods. He pays his workers. Then he waits ninety days for
his money.

The money to close that gap exists. But it sits inside local banks. A funder in
another country cannot reach it.

We opened that door.

### 2 · Problem  ·  ~45s

This market is big and it is real.

In Türkiye there are four million active companies. Almost all of them —
ninety-nine percent — are small businesses. Last year the factoring sector moved
one point eight trillion lira, for about ninety-five thousand customers.

So people already pay for this. But the market has two problems.

First, nobody can check the price. The cost is decided in a meeting, one deal at
a time. There is no public rate.

Second — and this is the big one — the money is bank money. A factoring company
can only lend what its own balance sheet allows. And that balance sheet stops at
the border. Someone abroad may want to take the same risk for the same price.
He simply cannot reach it.

### 3 · Solution  ·  ~50s

This is what we do.

A supplier uploads a signed e-invoice. The contract writes its ETTN. The ETTN is
the tax office's unique number for that document. If someone sends the same ETTN
again, the contract says no.

Then the buyer confirms the debt on chain. After that, anyone who holds USDC can
fund this invoice. In seconds. From fifty dollars.

The supplier gets paid the same day, in lira, to a normal bank account. He never
touches crypto. And the funder never opens a bank account in Türkiye.

### 4 · Architecture  ·  ~60s

We have four Soroban contracts on testnet. Let me show you three things.

**One ETTN, one financing.** This is our main rule. It is not a line in a
database. It is inside the contract. A licensed factoring company in Türkiye can
already check a central registry. A funder in Berlin cannot. Our contract gives
him the same safety, and he does not have to join anything.

**We calculate the price. We do not decide it.** There are four parts. Two of
them are read from the chain every time. And every part says where it comes
from. So a number that came from a setting cannot look like a live number. The
screen shows the difference.

**The money reaches a bank account.** We use SEP-6, in both directions, with a
real anchor. The supplier sells USDC and gets lira. The buyer pays in lira at
the end. We read everything about the anchor at run time. To use a different
anchor, we only change one domain name.

### 5 · Competitive advantage  ·  ~35s

Two things make us different from other on-chain supply chain finance projects.

First, we connect financing to a **government document number**. The tax office
gives the ETTN. It is unique for every invoice. So we do not have to keep that
list ourselves. The tax system does it.

Second, our numbers can be checked. Our DeFi yield is not a promise. The code
hash of our vault is the same as the hash DeFindex publishes — byte for byte.
And the rate comes live from a Blend v2 pool: one hundred twenty-nine basis
points, right now, from the chain.

### 6 · Honest limitations  ·  ~40s

Now I want to tell you what we do not solve. I prefer to say it myself.

**Nobody carries the currency risk yet.** The funder is paid in USDC. The buyer
owes lira. After ninety days these two numbers move apart. Our contract does not
say who pays the difference. We put that risk into the price. But we do not give
it to anyone.

**The funder's claim has no legal form yet.** The contract gives him a share of
a payment. It is not a legal transfer of the invoice. What this means under
securities law is different in every country. We need lawyers before we go live.

**A fake invoice can pass our checks.** We check the structure, not the reality.
Our real protection is the buyer's confirmation — only the address on the
invoice can sign. But that does not stop two people working together.

We prefer to say these things before you find them.

### 7 · Business model  ·  ~30s

We take fifty basis points from every funded invoice. It is inside the price
engine. We also take a fee from treasury yield, a share of the currency
exchange, and a subscription from big corporate buyers.

The interesting part is how we grow. We sell to the **buyer**, not to the
supplier. One big company brings tens of its suppliers with it. The buyer's
confirmation is our lock and also our sales channel.

### 8 · Roadmap and the ask  ·  ~35s

Next steps. A passkey smart account, so a passkey can sign its own
transactions. A real production anchor. The legal structure. Then a small pilot
with one corporate buyer and its suppliers.

We are applying to the Stellar Community Fund and to InstaAwards.

### 9 · Close  ·  ~20s

Everything I said is live on payper.live right now, on testnet. Our README shows
you the commands. You can check every number yourself. You do not have to
believe me.

One ETTN, one financing. The supplier is paid today. The funder never opens a
Turkish bank account.

Thank you.

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
  **"we prefer to say these things before you find them."**
- If a judge interrupts on DeFindex, the answer is one sentence: *the vault holds
  the position, the rate is read from Blend, and our vault's code hash matches
  theirs byte for byte.*
- If asked whether the user really signs: *a connected wallet signs its own
  transactions; the server prepares the call and hands over an unsigned envelope.*
