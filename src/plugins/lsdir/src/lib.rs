use std::fs::*;
use std::path::PathBuf;

use neon::prelude::*;

pub fn list_directory(dir: String) -> Result<Vec<String>, String> {
    let mut dir_contents = vec![];

    let mut read = vec![PathBuf::from(dir)];
    let mut index = 0usize;
    while index < read.len() {
        match read_dir(read[index].to_owned()) {
            Ok(dir) => {
                for i in dir {
                    let path = i.unwrap().path();

                    dir_contents.push(path.display().to_string());

                    if path.is_dir() {
                        read.push(path)
                    }
                }
                index += 1;
            }
            Err(err) => return Err(err.to_string())
        }
    }

    Ok(dir_contents)
}

fn ls_dir(mut cx: FunctionContext) -> JsResult<JsArray> {
    let path = cx.argument::<JsString>(0)?;
    let dir = match list_directory(path.value(&mut cx)) {
        Ok(dir) => dir,
        Err(err) => {
            let msg = cx.string(err);
            return cx.throw(msg);
        }
    };

    let obj = cx.empty_array();

    for (a, i) in dir.iter().enumerate() {
        let str = cx.string(i);
        obj.set(&mut cx, a as u32, str)?;
    }

    Ok(obj)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("ls_dir", ls_dir)?;

    Ok(())
}


#[cfg(test)]
mod tests {
    use crate::list_directory;

    #[test]
    fn ls_dir() {
        let dir = list_directory("/home/jcake/Code/Personal/mkjson/src/plugins/lsdir".to_owned()).unwrap();
        println!("{:#?}", dir);
    }
}