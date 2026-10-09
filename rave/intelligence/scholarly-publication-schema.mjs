/** Conservative offline scholarly publication JSON-LD: no fabricated identifiers or citations. */
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const https=x=>{try{return new URL(x).protocol==='https:'}catch{return false}};
const path=x=>typeof x==='string'&&/^\/(fa|en)\/[a-z0-9/_-]*$/.test(x)&&!x.includes('//');
export function buildScholarlyPublicationGraph({siteOrigin,publication,authorId}={}){
 if(!https(siteOrigin)||!https(authorId)||!publication||publication.editorialVerified!==true)throw new Error('Verified publication and author required');
 const {kind,titleFa,titleEn,pathFa,pathEn,abstractEn,publicationDate,doi,isbn}=publication;
 if(!['article','book'].includes(kind)||![titleFa,titleEn,abstractEn].every(nonempty)||!path(pathFa)||!path(pathEn))throw new Error('Complete bilingual publication metadata required');
 if(publicationDate!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate))throw new Error('Invalid publication date');
 if(doi!==undefined&&!/^10\.\d{4,9}\/\S+$/i.test(doi))throw new Error('Invalid DOI');
 if(isbn!==undefined&&!/^(?:97[89])?\d{9}[\dX]$/.test(isbn.replace(/[-\s]/g,'')))throw new Error('Invalid ISBN');
 if(kind==='article'&&isbn!==undefined||kind==='book'&&doi!==undefined)throw new Error('Identifier does not match publication type');
 const origin=new URL(siteOrigin).origin;
 const url=origin+pathEn;
 const entity={'@type':kind==='book'?'Book':'ScholarlyArticle','@id':url+'#publication',url,headline:titleEn,alternateName:titleFa,description:abstractEn,author:{'@id':authorId},inLanguage:['en','fa']};
 if(publicationDate)entity.datePublished=publicationDate;
 if(doi)entity.identifier='https://doi.org/'+doi;
 if(isbn)entity.isbn=isbn;
 return {'@context':'https://schema.org','@graph':[entity,{'@type':'WebPage','@id':url+'#webpage',url,about:{'@id':entity['@id']},inLanguage:'en'}]};
}
