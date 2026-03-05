export const WORDS: string[] = [
    "about","above","accept","across","act","action","active","add","after","again","against","age","agree","air","all",
    "allow","almost","alone","along","already","also","always","among","amount","and","animal","answer","any","appear",
    "apply","area","argue","arm","around","arrive","art","as","ask","assume","at","attack","attempt","attention","author",
    "avoid","away","baby","back","bad","bag","ball","bank","bar","base","be","bear","beat","beautiful","because","become",
    "bed","before","begin","behind","believe","best","better","between","big","bill","bird","bit","black","blood","blue",
    "board","body","book","born","both","box","boy","break","bring","brother","build","business","but","buy","call","camera",
    "can","capital","car","card","care","carry","case","catch","cause","cell","center","central","certain","chair","chance",
    "change","charge","check","child","choose","church","city","class","clear","close","coach","cold","collection","college",
    "color","come","common","community","company","compare","computer","concern","condition","consider","contain","continue",
    "control","cost","could","country","couple","course","cover","create","crime","culture","cup","current","cut","dark",
    "data","day","dead","deal","death","decide","decision","deep","defense","degree","depend","describe","design","detail",
    "develop","die","difference","different","difficult","direction","discover","discuss","discussion","do","doctor","dog",
    "door","down","draw","dream","drive","drop","during","each","early","east","easy","eat","economic","education","effect",
    "effort","eight","either","else","end","energy","enjoy","enough","enter","entire","environment","equal","especially",
    "establish","even","event","ever","every","exactly","example","exist","expect","experience","explain","eye","face","fact",
    "factor","fail","fall","family","far","fast","father","fear","feel","feeling","few","field","fight","figure","fill",
    "film","final","find","fine","finger","finish","fire","firm","first","fish","five","floor","focus","follow","food","foot",
    "for","force","foreign","forget","form","former","forward","four","free","friend","from","front","full","fund","future",
    "game","garden","gas","general","get","girl","give","glass","go","goal","good","government","great","green","ground",
    "group","grow","growth","guess","gun","guy","hair","half","hand","hang","happen","happy","hard","have","head","health",
    "hear","heart","heat","heavy","help","her","here","high","him","his","history","hit","hold","home","hope","hospital",
    "hot","hotel","hour","house","how","however","huge","human","hundred","husband","idea","identify","if","image","imagine",
    "impact","important","improve","in","include","including","increase","indeed","indicate","industry","information","inside",
    "instead","interest","into","investment","involve","issue","it","item","its","itself","job","join","just","keep","key",
    "kid","kill","kind","kitchen","know","knowledge","land","language","large","last","late","later","laugh","law","lawyer",
    "lay","lead","leader","learn","least","leave","left","leg","legal","less","let","letter","level","life","light","like",
    "likely","line","list","listen","little","live","local","long","look","lose","loss","lot","love","low","machine","magazine",
    "main","maintain","major","make","man","manage","management","many","market","marriage","material","matter","may","maybe",
    "me","mean","measure","media","medical","meet","meeting","member","memory","mention","message","method","middle","might",
    "military","million","mind","minute","miss","mission","model","modern","moment","money","month","more","morning","most",
    "mother","mouth","move","movement","movie","much","music","must","my","name","nation","national","natural","nature","near",
    "nearly","need","network","never","new","news","next","nice","night","no","none","nor","north","not","note","nothing",
    "notice","now","number","occur","of","off","offer","office","often","oil","ok","old","on","once","one","only","onto",
    "open","operation","opportunity","option","or","order","organization","other","others","our","out","outside","over","own",
    "owner","page","pain","paper","parent","part","participant","particular","particularly","party","pass","past","patient",
    "pattern","pay","peace","people","per","perform","performance","perhaps","period","person","personal","phone","physical",
    "pick","picture","piece","place","plan","plant","play","player","point","police","policy","political","poor","popular",
    "population","position","positive","possible","power","practice","prepare","present","president","pressure","pretty",
    "prevent","price","private","problem","process","produce","product","production","professional","program","project",
    "property","protect","prove","provide","public","pull","purpose","push","put","quality","question","quick","quite","race",
    "radio","raise","range","rate","rather","reach","read","ready","real","reality","realize","really","reason","receive",
    "recent","recognize","record","reduce","reflect","region","relate","relationship","religious","remain","remember","remove",
    "report","represent","require","research","resource","respond","response","responsibility","rest","result","return","reveal",
    "rich","right","rise","risk","road","rock","role","room","rule","run","safe","same","save","say","scene","school","science",
    "score","sea","season","seat","second","section","security","see","seek","seem","sell","send","senior","sense","series",
    "serious","serve","service","set","seven","several","shake","share","she","shoot","short","shot","should","show","side",
    "sign","significant","similar","simple","simply","since","sing","single","sister","sit","site","six","size","skill","skin",
    "small","smile","so","social","society","soldier","some","somebody","someone","something","sometimes","son","song","soon",
    "sort","sound","source","south","space","speak","special","specific","speech","spend","sport","spring","staff","stage",
    "stand","standard","star","start","state","statement","station","stay","step","still","stock","stop","store","story",
    "strategy","street","strong","structure","student","study","stuff","style","subject","success","successful","such","suddenly",
    "suffer","suggest","summer","support","sure","surface","system","table","take","talk","task","teach","teacher","team","tell",
    "ten","tend","term","test","than","thank","that","the","their","them","then","there","these","they","thing","think","third",
    "this","those","though","thought","thousand","three","through","time","to","today","together","tonight","too","top","total",
    "tough","toward","town","trade","training","travel","treat","treatment","tree","trial","trip","true","truth","try","turn",
    "two","type","under","understand","unit","until","up","upon","us","use","usually","value","various","very","victim","view",
    "visit","voice","vote","wait","walk","wall","want","war","watch","water","way","we","weapon","wear","week","weight","well",
    "west","what","whatever","when","where","whether","which","while","white","who","whole","why","wide","wife","will","win",
    "wind","window","wish","with","within","without","woman","wonder","word","work","worker","world","worry","would","write",
    "writer","wrong","year","yes","yet","you","young","your"
];

export function randomWord(): string {
    return WORDS[Math.floor(Math.random() * WORDS.length)]!;
}

export function generateWordQueue(n: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(randomWord());
    return out;
}

export function countCorrectCharsForWord(target: string, typed: string): number {
    const a = typed.slice(0, target.length);
    const len = Math.min(target.length, a.length);
    let c = 0;
    for (let i = 0; i < len; i++) if (a[i] === target[i]) c++;
    return c;
}