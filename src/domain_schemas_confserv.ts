import bcryptjs from 'bcryptjs'
import { domainSchemasTesttab } from './share/domain_schemas/domain_schemas_testtab.js'
import { domainSchemasUser } from './share/domain_schemas/domain_schemas_user.js'
import { ErrorCustomImpossible } from './share/error.js'

if (!domainSchemasUser.domSchemaCreate) throw new ErrorCustomImpossible('')
domainSchemasUser.domSchemaCreate.password = {
  ...domainSchemasUser.domSchemaCreate.password,
  convert: async function (
    password: string
  ): Promise<string> {
    const passwordHash = await bcryptjs.hash(password, 10)
    return passwordHash
  }
}

if(!domainSchemasTesttab) throw new ErrorCustomImpossible('')
