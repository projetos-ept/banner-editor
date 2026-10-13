/* Editable compositions. All artwork is built from local blocks. */
(function(root,factory){const api=factory(typeof module==='object'?require('./banner-core.js'):root.BannerCore);if(typeof module==='object')module.exports=api;else root.BanerlabTemplates=api;})(globalThis,function(Core){
  'use strict';
  const catalog=[
    {id:'scientific',name:'Pesquisa em foco',category:'Acadêmico',description:'Duas colunas, metodologia e resultados.',color:'#164f76'},
    {id:'event',name:'Encontro criativo',category:'Evento',description:'Título marcante, programação e inscrição.',color:'#ba492c'},
    {id:'business',name:'Feito no território',category:'Negócio',description:'Produtos, diferenciais e contato.',color:'#315a43'},
    {id:'education',name:'Aprender e compartilhar',category:'Educação',description:'Quatro etapas para uma aula ou oficina.',color:'#6943a0'},
    {id:'minimal',name:'Ideias essenciais',category:'Institucional',description:'Composição editorial com espaço e contraste.',color:'#263536'}
  ];
  const palettes=[
    {name:'Território',colors:['#124830','#d27e14','#ae3f22'],paper:'#faf7ef',ink:'#193627'},
    {name:'Oceano',colors:['#164f76','#257f98','#b76521'],paper:'#f0f7fa',ink:'#183446'},
    {name:'Violeta',colors:['#6943a0','#aa4265','#365e8e'],paper:'#f7f3fb',ink:'#352447'},
    {name:'Editorial',colors:['#263536','#586964','#af5d3c'],paper:'#f6f3eb',ink:'#263536'}
  ];
  function create(id, preset='90x120'){
    if(!catalog.some(x=>x.id===id))throw new Error('Modelo desconhecido.');
    const doc=Core.blank();doc.preset=preset;const info=catalog.find(x=>x.id===id);doc.title=info.name;
    const put=b=>doc.blocks.push(Core.block({border:0,radius:0,padding:0,fillOpacity:0,...b}));
    const text=(name,txt,x,y,w,h,size,color='#193627',extra={})=>put({type:'text',name,text:txt,x,y,w,h,fontSize:size,color,...extra});
    const shape=(name,x,y,w,h,fill)=>put({type:'shape',name,x,y,w,h,fill,fillOpacity:1});
    const section=(name,txt,x,y,w,h,accent)=>put({type:'section',name,heading:name.toUpperCase(),text:txt,x,y,w,h,fontSize:17,headingSize:15,padding:16,accent,fill:'#f5f7f5',fillOpacity:1,radius:8});
    if(id==='scientific'){
      shape('Faixa superior',0,0,100,23,'#164f76');text('Instituição','INSTITUIÇÃO · MOSTRA DE PESQUISA',5,4,90,4,14,'#d4eaf1',{bold:true});
      text('Título','Um título claro para\nsua pesquisa',5,10,90,10,34,'#ffffff',{bold:true});
      text('Autoria','Autores · orientação · instituição',5,25,90,5,16);
      section('Introdução','Apresente o tema, o contexto e a pergunta de pesquisa.',5,33,43,23,'#164f76');
      section('Objetivos','Descreva o objetivo principal e os resultados esperados.',52,33,43,23,'#257f98');
      section('Metodologia','Explique como o trabalho foi realizado. Inclua procedimentos e materiais.',5,59,43,24,'#257f98');
      section('Resultados','Apresente os achados e substitua este texto por dados, fotos ou conclusões.',52,59,43,24,'#164f76');
      text('Conclusão e referências','CONCLUSÃO E REFERÊNCIAS\nRegistre a contribuição do trabalho e as fontes consultadas.',5,87,90,9,16);
    }else if(id==='event'){
      doc.background.color='#fff4e3';shape('Faixa lateral',0,0,3,100,'#ba492c');
      text('Categoria','CULTURA · CONEXÕES · COMUNIDADE',7,6,87,5,16,'#ba492c',{bold:true});
      text('Título','ENCONTRO\nCRIATIVO',7,16,88,24,64,'#ba492c',{bold:true,lineHeight:1});
      text('Chamada','Ideias que aproximam.\nPessoas que transformam.',8,43,82,13,29);
      shape('Informações',7,61,86,17,'#ba492c');text('Data e local','DATA · HORÁRIO\nNOME DO LOCAL · CIDADE',11,64,78,10,23,'#ffffff',{bold:true});
      text('Programação','OFICINAS  /  CONVERSAS  /  EXPOSIÇÕES\nInclua aqui a programação e os detalhes do encontro.',8,82,84,10,18);
      text('Contato','INSCRIÇÕES: SEU CONTATO OU SITE',8,94,84,3,13,'#ba492c',{bold:true});
    }else if(id==='business'){
      doc.background.color='#f6f3e8';text('Categoria','EMPREENDEDORISMO LOCAL',6,5,88,4,15,'#315a43',{bold:true});
      text('Nome do negócio','Feito no\nterritório.',6,14,88,22,56,'#315a43',{font:'Georgia',bold:true,lineHeight:1.1});
      text('Descrição','Conte a história do seu negócio e o que torna seu trabalho especial.',6,39,88,11,25);
      section('O que oferecemos','Produto ou serviço 01\nProduto ou serviço 02\nProduto ou serviço 03',6,54,42,24,'#315a43');
      section('Nossos diferenciais','Produção local\nCuidado em cada detalhe\nAtendimento próximo',52,54,42,24,'#aa6135');
      shape('Contato',0,85,100,15,'#315a43');text('Fale com a gente','VAMOS CONVERSAR?\nTelefone · endereço · redes sociais',6,88,88,9,23,'#ffffff',{bold:true});
    }else if(id==='education'){
      doc.background.color='#f7f3fb';text('Categoria','OFICINA / GUIA DE APRENDIZAGEM',6,5,88,4,14,'#6943a0',{bold:true});
      text('Título','Aprender é\ncompartilhar.',6,13,88,18,45,'#352447',{bold:true,lineHeight:1.1});
      text('Descrição','Um percurso em quatro etapas para explorar o tema.',6,33,88,7,21);
      ['Investigar','Experimentar','Construir','Compartilhar'].forEach((name,i)=>section('0'+(i+1)+' · '+name,'Descreva a atividade, os materiais e a pergunta que orienta esta etapa.',6+(i%2)*46,44+Math.floor(i/2)*23,42,20,i%2?'#aa4265':'#6943a0'));
      text('Objetivo','AO FINAL: descreva o que a turma terá aprendido.',6,93,88,4,16,'#6943a0',{bold:true});
    }else{
      doc.background.color='#f6f3eb';shape('Linha',6,7,88,.4,'#263536');text('Categoria','INSTITUIÇÃO / PROJETO',6,10,88,5,14);
      text('Título','Ideias\nessenciais.',6,22,88,26,62,'#263536',{font:'Georgia',lineHeight:1});
      text('Mensagem','Uma mensagem principal.\nUma intenção clara.',6,53,88,14,29);
      text('Descrição','Apresente o propósito, o contexto e a transformação que seu projeto busca realizar. Use poucas palavras e valorize o que importa.',6,72,70,14,22);
      shape('Rodapé',6,91,88,.3,'#af5d3c');text('Contato','Saiba mais · contato · endereço',6,94,88,3,14);
    }
    return Core.normalize(doc);
  }
  function recolor(input,index){
    const d=Core.normalize(input),p=palettes[index]||palettes[0];d.background.color=p.paper;let n=0;
    d.blocks.forEach(b=>{
      if(b.type==='section'){b.accent=p.colors[n++%p.colors.length];b.fill=p.paper;b.color=p.ink;b.headingColor='#ffffff';}
      else if(b.type==='shape')b.fill=p.colors[n++%p.colors.length];
      else if(b.type==='text'){
        const rgb=b.color.slice(1).match(/../g).map(x=>parseInt(x,16));
        b.color=(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)>180?'#ffffff':p.ink;
      }
    });return d;
  }
  return {catalog,palettes,create,recolor};
});
