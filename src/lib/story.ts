import type { GameState } from './economy';

export type StoryGoal = { label: string; key: 'lifetimeCaught'|'lifetimeSold'|'upgrades'|'area'; target: number };
export type StoryChapter = { id:number; title:string; subtitle:string; speaker:string; dialogue:string[]; goals:StoryGoal[]; reward:string };

/** Story unlocks are derived from validated gameplay statistics and work in both local demo and Supabase mode. */
export const STORY_CHAPTERS: StoryChapter[] = [
  { id:1,title:'Ngày trở về',subtitle:'Bình minh đầu tiên',speaker:'Chú Tám',
    dialogue:[
      'Sau bao năm ở thành phố, bạn trở về Bến Nhỏ. Con đường dẫn xuống bến vẫn thơm mùi muối biển, chỉ có quán hải sản của ông ngoại là đã đóng cửa từ lâu.',
      'Trong chiếc rương gỗ, bạn tìm thấy một cần câu cũ, mấy tấm ảnh bạc màu và mảnh giấy viết tay: “Biển không phụ người chịu khó. Nếu con trở về, hãy thắp lại ngọn đèn trước quán.”',
      'Chú Tám đang vá lưới ngoài bến, ngẩng lên cười: “Về rồi hả con? Đi câu với chú một chuyến. Cá đầu ngày mà bán được thì quán sống lại thôi!”'
    ],goals:[{label:'Câu được 3 con cá',key:'lifetimeCaught',target:3},{label:'Bán 2 con cá',key:'lifetimeSold',target:2}],reward:'Mở chương 2 · Gặp cô Sáu ở chợ cá'},
  { id:2,title:'Chợ cá sáng',subtitle:'Một mối quen mới',speaker:'Cô Sáu',
    dialogue:[
      'Mặt trời vừa lên, chợ hải sản đã ồn ào tiếng máy ghe và tiếng người gọi nhau. Cô Sáu nhìn chiếc giỏ cá của bạn, bật cười: “Giống ông ngoại con hồi trẻ quá!”',
      '“Câu được bao nhiêu thì quý bấy nhiêu, nhưng mở quán không thể chỉ trông vào may rủi. Thiếu hàng thì nhớ tới cô, cô để giá dễ thương.”',
      'Bạn nhận ra điều hành quán không chỉ là bắt được cá; còn phải biết giữ khách, tính giá và dành dụm từng đồng sửa quán.'
    ],goals:[{label:'Bán tổng cộng 5 con cá',key:'lifetimeSold',target:5},{label:'Nâng cấp quán 1 lần',key:'upgrades',target:1}],reward:'Mở chương 3 · Chuyến biển đầu tiên'},
  { id:3,title:'Chuyến biển đầu tiên',subtitle:'Chiếc thuyền của ông',speaker:'Chú Tám',
    dialogue:[
      'Một đêm gió lặng, chú Tám dẫn bạn ra mũi cầu cảng. Chiếc thuyền của ông ngoại nằm đó, lớp sơn xanh đã phai nhưng tấm biển tên vẫn còn.',
      '“Hồi xưa ông con đi xa tận rạn san hô. Đừng chỉ quanh quẩn bến này. Ngoài kia còn nhiều loài cá chưa từng thấy đâu.”',
      'Bạn sửa lại máy, buộc một nút dây chắc chắn rồi chuẩn bị cho chuyến ra khơi đầu tiên.'
    ],goals:[{label:'Câu tổng cộng 8 con cá',key:'lifetimeCaught',target:8},{label:'Mở vùng biển thứ 2',key:'area',target:2}],reward:'Mở chương 4 · Đêm hội làng chài'},
  { id:4,title:'Đêm hội làng chài',subtitle:'Mâm cơm bên biển',speaker:'Bà Năm',
    dialogue:[
      'Tiếng trống hội vang khắp Bến Nhỏ. Bà Năm ghé quán, đặt một giỏ rau thơm lên bàn: “Năm nay quán mình lo mâm hải sản cho làng nghe con.”',
      'Khách kéo đến đông hơn thường lệ. Có người kể chuyện chuyến biển năm xưa, có người lần đầu thấy quán sáng đèn trở lại.',
      'Giữa tiếng cười, bạn hiểu rằng mình đang dựng lại nhiều hơn một cửa hàng.'
    ],goals:[{label:'Bán tổng cộng 12 con cá',key:'lifetimeSold',target:12},{label:'Nâng cấp quán 2 lần',key:'upgrades',target:2}],reward:'Mở chương 5 · Bí mật hải đăng'},
  { id:5,title:'Bí mật ngọn hải đăng',subtitle:'Trang nhật ký cuối cùng',speaker:'Người giữ đèn',
    dialogue:[
      'Một chiếc hộp gỗ dạt vào bờ sau cơn mưa. Bên trong là trang nhật ký của ông ngoại, vẽ một ngọn hải đăng nhỏ và vùng nước xanh sâu thẳm.',
      '“Đi đâu thì cũng nhớ đường về. Ngọn đèn của làng là để người đi biển biết vẫn có ai đang chờ.”',
      'Bạn lên thuyền hướng ra biển xa. Hành trình của Quán Hải Sản chỉ mới bắt đầu.'
    ],goals:[{label:'Câu tổng cộng 20 con cá',key:'lifetimeCaught',target:20},{label:'Mở vùng biển thứ 3',key:'area',target:3}],reward:'Hoàn thành mùa 1 · Nhật ký Bến Nhỏ'}
];

export function currentChapter(state: GameState): number {
  let unlocked=1;
  for(let i=0;i<STORY_CHAPTERS.length-1;i++){
    if(STORY_CHAPTERS[i].goals.every(g=>state[g.key]>=g.target)) unlocked=i+2;
    else break;
  }
  return unlocked;
}
export function chapterComplete(state:GameState,chapter:StoryChapter):boolean {
  return chapter.goals.every(g=>state[g.key]>=g.target);
}
